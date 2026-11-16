import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type { CheckoutIntent } from '../src/repositories/checkout-intents.js';
import { recoverCheckoutSession, type CheckoutRecoveryDeps } from '../src/services/checkout-recovery.js';
import type { StripeEventLike } from '../src/services/webhooks.js';
const id = '00000000-0000-4000-a000-202611160012';
const metadata = { brand: 'boreale', checkoutIntentId: id, orderId: 'order-fixture', orderNumber: 'BOR-QA', stripeAccountId: 'acct_fixture', stripeMode: 'test' };
const session = { id: 'cs_test_fixture', status: 'complete', payment_status: 'paid', payment_intent: 'pi_fixture', amount_total: 4200,
  currency: 'eur', livemode: false, metadata, expires_at: 1794920000, url: null } as unknown as Stripe.Checkout.Session;
const intent = { id, order_id: 'order-fixture', order_number: 'BOR-QA', session_id: null, stripe_params: { metadata },
  request_hash: 'a'.repeat(64), state: 'creating', stripe_key: 'boreale-checkout/fixture/v1', lease_token: null,
  first_attempt_at: null, retry_deadline: null,
  snapshot: { order: { email: 'qa@example.invalid', currency: 'EUR', subtotalCents: 4200, discountCents: 0, shippingCents: 0,
    totalCents: 4200, shippingMethod: 'standard', discountCode: null,
    shippingAddress: { firstName: 'QA', lastName: 'Only', line1: '12 rue QA', postalCode: '75001', city: 'Paris', country: 'FR' },
    items: [] }, items: [], totals: { totalCents: 4200, currency: 'EUR', subtotalCents: 4200, discountCents: 0, shippingCents: 0 } },
} satisfies CheckoutIntent;
const order = { id: 'order-fixture', number: 'BOR-QA', email: 'qa@example.invalid', status: 'pending', total_cents: 4200, discount_code: null };
const paid: StripeEventLike = { type: 'checkout.session.completed', data: { object: { id: session.id, payment_intent: 'pi_fixture' } } };
function deps(): CheckoutRecoveryDeps {
  return { environment: vi.fn().mockResolvedValue({ accountId: 'acct_fixture', livemode: false }), retrieve: vi.fn().mockResolvedValue(session),
    intent: vi.fn().mockResolvedValue(intent), bind: vi.fn().mockResolvedValue(intent), order: vi.fn().mockResolvedValue(order) };
}
describe('verified early webhook checkout binding (no provider or database)', () => {
  it('retrieves provider evidence, verifies frozen intent and atomically binds before returning order', async () => {
    const d = deps(); expect(await recoverCheckoutSession(paid, d)).toEqual(order);
    expect(d.retrieve).toHaveBeenCalledWith(session.id); expect(d.bind).toHaveBeenCalledWith(id, session);
    expect(vi.mocked(d.bind).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(d.order).mock.invocationCallOrder[0]!);
  });
  it.each([{ livemode: true }, { metadata: { ...metadata, orderId: 'other' } }, { metadata: { ...metadata, stripeAccountId: 'acct_other' } },
    { metadata: { ...metadata, stripeMode: 'live' } }, { amount_total: 1 }, { currency: 'usd' }, { payment_intent: 'pi_other' }, { payment_status: 'unpaid' }])('never binds inconsistent provider scope/evidence %#', async patch => {
    const d = deps(); vi.mocked(d.retrieve).mockResolvedValue({ ...session, ...patch } as Stripe.Checkout.Session);
    await expect(recoverCheckoutSession(paid, d)).rejects.toMatchObject({ code: 'checkout_recovery_mismatch' });
    expect(d.bind).not.toHaveBeenCalled();
  });
  it('does not recover a foreign session or an unknown intent from metadata alone', async () => {
    const d = deps(); vi.mocked(d.retrieve).mockResolvedValue({ ...session, metadata: {} });
    expect(await recoverCheckoutSession(paid, d)).toBeNull(); expect(d.bind).not.toHaveBeenCalled();
    vi.mocked(d.retrieve).mockResolvedValue(session); vi.mocked(d.intent).mockResolvedValue(null);
    expect(await recoverCheckoutSession(paid, d)).toBeNull(); expect(d.bind).not.toHaveBeenCalled();
  });
  it('verifies frozen provider account even after configuration has changed', async () => {
    const d = deps(); vi.mocked(d.intent).mockResolvedValue({ ...intent, stripe_params: { metadata: { ...metadata, stripeAccountId: 'acct_old' } } });
    await expect(recoverCheckoutSession(paid, d)).rejects.toMatchObject({ code: 'checkout_recovery_mismatch' }); expect(d.bind).not.toHaveBeenCalled();
  });
  it('recovers a proven expired session with null URL before pending cancellation', async () => {
    const d = deps(); const expired = { ...session, status: 'expired', payment_status: 'unpaid' } as Stripe.Checkout.Session;
    vi.mocked(d.retrieve).mockResolvedValue(expired);
    await expect(recoverCheckoutSession({ ...paid, type: 'checkout.session.expired' }, d)).resolves.toEqual(order);
    expect(d.bind).toHaveBeenCalledWith(id, expired);
  });
  it('refuses cancellation recovery when the provider reports payment succeeded', async () => {
    const d = deps(); await expect(recoverCheckoutSession({ ...paid, type: 'checkout.session.expired' }, d)).rejects.toMatchObject({ code: 'checkout_recovery_mismatch' });
    expect(d.bind).not.toHaveBeenCalled();
  });
  it('propagates binding failure so the webhook remains retryable', async () => {
    const d = deps(); vi.mocked(d.bind).mockRejectedValue(new Error('uncertain commit'));
    await expect(recoverCheckoutSession(paid, d)).rejects.toThrow('uncertain commit'); expect(d.order).not.toHaveBeenCalled();
  });
});
