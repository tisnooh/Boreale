import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ preview: false, post: vi.fn() }));
vi.mock('@/lib/config', () => ({ isPreview: () => state.preview, isLaunch: () => false, PREVIEW_NOTICE: 'Mode preview.' }));
vi.mock('@/lib/api', async original => ({ ...await original<typeof import('@/lib/api')>(), api: { post: state.post } }));
import { ApiError } from '@/lib/api';
import { submitCheckout, type CheckoutPayload } from '@/lib/services/actions';
import { restartExpiredCheckoutAttempt } from '@/lib/checkout-attempt';
const payload: CheckoutPayload = { items: [{ variantId: 'variant-test', quantity: 1 }], shippingMethod: 'standard',
  customer: { email: 'buyer@example.fr', firstName: 'Camille', lastName: 'Durand',
    address: { line1: '12 rue de Test', postalCode: '75001', city: 'Paris', country: 'FR' } } };
const response = { data: { url: 'https://checkout.stripe.com/c/pay/cs_test_fixture', orderNumber: 'BOR-TEST', totals: {} } };
beforeEach(() => { state.preview = false; state.post.mockReset(); sessionStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });

describe('checkout action recovery (API mocked)', () => {
  it('uses exactly the same key/body after an ambiguous network failure', async () => {
    state.post.mockRejectedValueOnce(new ApiError(0, 'network_error', 'Network')).mockResolvedValueOnce(response);
    await expect(submitCheckout(payload, 'customer-test')).rejects.toMatchObject({ code: 'network_error' });
    await expect(submitCheckout(payload, 'customer-test')).resolves.toMatchObject({ status: 'redirect' });
    expect(state.post).toHaveBeenCalledTimes(2);
    expect(state.post.mock.calls[0]).toEqual(state.post.mock.calls[1]);
    expect(state.post.mock.calls[0][1]).toMatchObject({ customerMode: 'customer', idempotencyKey: expect.any(String) });
  });
  it('keeps an uncertain key when a later request receives a preflight rejection', async () => {
    state.post.mockRejectedValueOnce(new ApiError(0, 'network_error', 'Network'))
      .mockRejectedValueOnce(new ApiError(503, 'checkout_closed', 'Closed'));
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code: 'network_error' });
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code: 'checkout_closed' });
    await expect(submitCheckout({ ...payload, shippingMethod: 'express' })).rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(state.post).toHaveBeenCalledTimes(2);
  });
  it.each(['insufficient_stock', 'checkout_live_not_approved', 'checkout_email_unavailable'])('allows changed input after a first rejection for %s', async code => {
    state.post.mockRejectedValueOnce(new ApiError(422, code, 'Unavailable')).mockResolvedValueOnce(response);
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code });
    await submitCheckout({ ...payload, items: [{ variantId: 'another', quantity: 1 }] });
    expect(state.post.mock.calls[0][1].idempotencyKey).not.toBe(state.post.mock.calls[1][1].idempotencyKey);
  });
  it('blocks account downgrade and payload changes without another API request', async () => {
    state.post.mockRejectedValueOnce(new ApiError(500, 'provider_failed', 'Unknown result'));
    await expect(submitCheckout(payload, 'customer-a')).rejects.toMatchObject({ status: 500 });
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    await expect(submitCheckout({ ...payload, items: [{ variantId: 'variant-test', quantity: 2 }] }, 'customer-a'))
      .rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(state.post).toHaveBeenCalledOnce();
  });
  it('does not call the API when durable storage fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code: 'checkout_recovery_unavailable' });
    expect(state.post).not.toHaveBeenCalled();
  });
  it('requires explicit restart after verified expiration before changing the request key', async () => {
    state.post.mockRejectedValueOnce(new ApiError(409, 'checkout_session_expired', 'Session expirée'))
      .mockRejectedValueOnce(new ApiError(409, 'checkout_session_expired', 'Session expirée')).mockResolvedValueOnce(response);
    const expired = await submitCheckout(payload).then(() => { throw new Error('Expected expiration'); }, error => error as ApiError);
    expect(expired).toMatchObject({ code: 'checkout_session_expired', details: { expiredAttemptKey: expect.any(String) } });
    const key = state.post.mock.calls[0][1].idempotencyKey;
    expect(JSON.parse(sessionStorage.getItem('boreale.checkout-attempt.v1')!).key).toBe(key);
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code: 'checkout_session_expired' });
    expect(state.post.mock.calls[1][1].idempotencyKey).toBe(key);
    expect(restartExpiredCheckoutAttempt((expired.details as { expiredAttemptKey: string }).expiredAttemptKey)).toBe(true);
    await submitCheckout({ ...payload, shippingMethod: 'express' });
    expect(state.post.mock.calls[2][1].idempotencyKey).not.toBe(key);
  });
  it.each(['checkout_session_closed', 'checkout_already_completed', 'checkout_in_progress', 'checkout_reconciliation_required'])('does not authorise reset for %s', async code => {
    state.post.mockRejectedValueOnce(new ApiError(409, code, 'À vérifier'));
    await expect(submitCheckout(payload)).rejects.toMatchObject({ code });
    const key = state.post.mock.calls[0][1].idempotencyKey;
    expect(restartExpiredCheckoutAttempt(key)).toBe(false);
    await expect(submitCheckout({ ...payload, shippingMethod: 'express' })).rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    expect(state.post).toHaveBeenCalledOnce();
  });
  it('preview does not access storage, crypto or the remote API', async () => {
    state.preview = true;
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('must not read'); });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('must not write'); });
    vi.stubGlobal('crypto', undefined);
    expect(await submitCheckout(payload)).toMatchObject({ status: 'preview' });
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled(); expect(state.post).not.toHaveBeenCalled();
  });
});
