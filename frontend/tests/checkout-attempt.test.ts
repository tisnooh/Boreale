import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginCheckoutAttempt, bindCheckoutAttempt, completeCheckoutAttempt, markCheckoutAttemptExpired, rejectFirstCheckoutAttempt, restartExpiredCheckoutAttempt } from '@/lib/checkout-attempt';
import type { CheckoutPayload } from '@/lib/services/actions';

const payload: CheckoutPayload = {
  items: [{ variantId: 'variant-b', quantity: 1 }, { variantId: 'variant-a', quantity: 2 }],
  shippingMethod: 'standard',
  customer: { email: 'buyer@example.fr', firstName: 'Camille', lastName: 'Durand',
    address: { line1: '12 rue de Test', postalCode: '75001', city: 'Paris', country: 'FR' } },
};
beforeEach(() => { sessionStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });

describe('durable browser checkout attempt', () => {
  it('persists an opaque key/hash and reuses it after a module reload', async () => {
    const first = await beginCheckoutAttempt(payload, 'customer-a');
    expect(first.previouslyUncertain).toBe(false);
    const raw = sessionStorage.getItem('boreale.checkout-attempt.v1')!;
    for (const value of ['buyer@example.fr', 'Camille', '12 rue de Test', 'variant-a', 'customer-a']) expect(raw).not.toContain(value);
    vi.resetModules();
    const { beginCheckoutAttempt: reloaded } = await import('@/lib/checkout-attempt');
    expect(await reloaded(payload, 'customer-a')).toEqual({ key: first.key, previouslyUncertain: true });
  });
  it('canonicalises equivalent cart order, quantities and whitespace', async () => {
    const first = await beginCheckoutAttempt(payload, null);
    const equivalent = { ...payload, items: [{ variantId: 'variant-a', quantity: 1 }, { variantId: 'variant-b', quantity: 1 }, { variantId: 'variant-a', quantity: 1 }],
      customer: { ...payload.customer, email: ' BUYER@example.fr ' } };
    expect((await beginCheckoutAttempt(equivalent, null)).key).toBe(first.key);
  });
  it('serialises concurrent preparation through the persisted attempt', async () => {
    const results = await Promise.all([beginCheckoutAttempt(payload, null), beginCheckoutAttempt(payload, null)]);
    expect(results[0].key).toBe(results[1].key);
    expect(results.map(result => result.previouslyUncertain).sort()).toEqual([false, true]);
  });
  it.each(['cart', 'address', 'shipping', 'actor', 'guest'])('blocks changing %s after an uncertain attempt', async change => {
    const first = await beginCheckoutAttempt(payload, 'customer-a');
    const changed = change === 'cart' ? { ...payload, items: [{ variantId: 'variant-a', quantity: 4 }] }
      : change === 'address' ? { ...payload, customer: { ...payload.customer, address: { ...payload.customer.address, city: 'Lyon' } } }
        : change === 'shipping' ? { ...payload, shippingMethod: 'express' as const } : payload;
    await expect(beginCheckoutAttempt(changed, change === 'actor' ? 'customer-b' : change === 'guest' ? null : 'customer-a'))
      .rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(JSON.parse(sessionStorage.getItem('boreale.checkout-attempt.v1')!).key).toBe(first.key);
  });
  it('allows a new key only after definitive rejection of the first attempt', async () => {
    const first = await beginCheckoutAttempt(payload, null);
    rejectFirstCheckoutAttempt(first);
    const next = await beginCheckoutAttempt(payload, null);
    expect(next.key).not.toBe(first.key);
    const retry = await beginCheckoutAttempt(payload, null);
    rejectFirstCheckoutAttempt(retry);
    expect((await beginCheckoutAttempt(payload, null)).key).toBe(next.key);
  });
  it('cannot clear an attempt created after an obsolete rejection callback', async () => {
    const old = await beginCheckoutAttempt(payload, null);
    rejectFirstCheckoutAttempt(old);
    const next = await beginCheckoutAttempt(payload, null);
    rejectFirstCheckoutAttempt(old);
    expect((await beginCheckoutAttempt(payload, null)).key).toBe(next.key);
  });
  it('clears only after matching order is paid and durably recorded', async () => {
    const attempt = await beginCheckoutAttempt(payload, null);
    bindCheckoutAttempt(attempt, 'BOR-TEST-1');
    expect(completeCheckoutAttempt({ paymentStatus: 'paid', orderNumber: 'BOR-TEST-1' })).toBe(false);
    expect(completeCheckoutAttempt({ paymentStatus: 'paid', paidOrderRecorded: true, orderNumber: 'BOR-OTHER' })).toBe(false);
    expect(completeCheckoutAttempt({ paymentStatus: 'unpaid', paidOrderRecorded: true, orderNumber: 'BOR-TEST-1' })).toBe(false);
    expect(completeCheckoutAttempt({ paymentStatus: 'paid', paidOrderRecorded: true, orderNumber: 'BOR-TEST-1' })).toBe(true);
    expect(sessionStorage.length).toBe(0);
  });
  it('keeps a verified expired attempt until an explicit restart, then issues a new key', async () => {
    const attempt = await beginCheckoutAttempt(payload, null);
    expect(markCheckoutAttemptExpired(attempt)).toBe(true);
    expect((await beginCheckoutAttempt(payload, null)).key).toBe(attempt.key);
    await expect(beginCheckoutAttempt({ ...payload, shippingMethod: 'express' }, null))
      .rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(restartExpiredCheckoutAttempt(attempt.key)).toBe(true);
    expect((await beginCheckoutAttempt({ ...payload, shippingMethod: 'express' }, null)).key).not.toBe(attempt.key);
  });
  it('does not permit an explicit reset for an uncertain or completed-session attempt', async () => {
    const attempt = await beginCheckoutAttempt(payload, null);
    expect(restartExpiredCheckoutAttempt(attempt.key)).toBe(false);
    bindCheckoutAttempt(attempt, 'BOR-PAYMENT-IN-PROGRESS');
    expect(restartExpiredCheckoutAttempt(attempt.key)).toBe(false);
    expect((await beginCheckoutAttempt(payload, null)).key).toBe(attempt.key);
  });
  it('ignores expiration proofs and restart callbacks belonging to an obsolete key', async () => {
    const old = await beginCheckoutAttempt(payload, null);
    expect(markCheckoutAttemptExpired(old)).toBe(true);
    expect(restartExpiredCheckoutAttempt(old.key)).toBe(true);
    const next = await beginCheckoutAttempt(payload, null);
    expect(markCheckoutAttemptExpired(old)).toBe(false);
    expect(restartExpiredCheckoutAttempt(old.key)).toBe(false);
    expect((await beginCheckoutAttempt(payload, null)).key).toBe(next.key);
  });
  it('keeps expiration recovery when durable removal is blocked', async () => {
    const attempt = await beginCheckoutAttempt(payload, null);
    expect(markCheckoutAttemptExpired(attempt)).toBe(true);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(restartExpiredCheckoutAttempt(attempt.key)).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('boreale.checkout-attempt.v1')!).key).toBe(attempt.key);
  });
  it('fails before payment when storage is blocked, without an ephemeral fallback key', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    await expect(beginCheckoutAttempt(payload, null)).rejects.toMatchObject({ code: 'checkout_recovery_unavailable' });
  });
  it('preserves malformed attempt evidence instead of silently replacing it', async () => {
    sessionStorage.setItem('boreale.checkout-attempt.v1', '{broken');
    await expect(beginCheckoutAttempt(payload, null)).rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).toBe('{broken');
  });
});
