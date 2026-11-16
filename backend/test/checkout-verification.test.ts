import { describe, expect, it, vi } from 'vitest';
import { verifyCheckoutSession, type CheckoutVerificationDeps, type VerificationSession } from '../src/services/checkout-verification.js';
const session: VerificationSession = {
  id: 'cs_test_fixture', status: 'complete', payment_status: 'paid', amount_total: 4200, currency: 'eur', payment_intent: 'pi_fixture',
  metadata: { brand: 'boreale', orderId: 'order-fixture', orderNumber: 'BOR-QA' },
};
const order = { id: 'order-fixture', number: 'BOR-QA', email: 'qa@example.invalid', status: 'paid', paid_at: '2026-11-16T00:00:00Z',
  total_cents: 4200, currency: 'EUR', fulfillment_status: 'blocked' };
const settlement = { order_id: order.id, session_id: session.id, payment_intent_id: 'pi_fixture', amount_cents: 4200, currency: 'EUR' };
function deps(): CheckoutVerificationDeps {
  return { order: vi.fn().mockResolvedValue(order), settlement: vi.fn().mockResolvedValue(settlement) };
}
describe('success verification separates provider payment from durable order recording', () => {
  it('requires matching durable settlement and exposes blocked fulfillment honestly', async () => {
    expect(await verifyCheckoutSession(session, deps())).toMatchObject({ paidOrderRecorded: true, fulfillmentStatus: 'blocked', orderNumber: 'BOR-QA' });
  });
  it('does not call a paid Stripe session a recorded order when binding is absent', async () => {
    const d = deps(); vi.mocked(d.order).mockResolvedValue(null);
    expect(await verifyCheckoutSession(session, d)).toMatchObject({ paidOrderRecorded: false, orderNumber: null, customerEmail: null });
    expect(d.settlement).not.toHaveBeenCalled();
  });
  it('does not confirm a pending order or a missing settlement', async () => {
    const d = deps(); vi.mocked(d.order).mockResolvedValue({ ...order, status: 'pending', paid_at: null });
    expect((await verifyCheckoutSession(session, d)).paidOrderRecorded).toBe(false);
    vi.mocked(d.order).mockResolvedValue(order); vi.mocked(d.settlement).mockResolvedValue(null);
    expect((await verifyCheckoutSession(session, d)).paidOrderRecorded).toBe(false);
  });
  it.each([{ amount_cents: 1 }, { currency: 'USD' }, { session_id: 'cs_other' }, { payment_intent_id: 'pi_other' }, { order_id: 'other' }])('rejects nonmatching settlement evidence %#', async patch => {
    const d = deps(); vi.mocked(d.settlement).mockResolvedValue({ ...settlement, ...patch });
    expect((await verifyCheckoutSession(session, d)).paidOrderRecorded).toBe(false);
  });
  it('does not consider complete and unpaid as paid', async () => {
    expect((await verifyCheckoutSession({ ...session, payment_status: 'unpaid' }, deps())).paidOrderRecorded).toBe(false);
  });
  it.each([{ amount_total: 1 }, { currency: 'usd' }, { metadata: { ...session.metadata, orderId: 'other' } }])('refuses mismatched order metadata or amounts %#', async patch => {
    await expect(verifyCheckoutSession({ ...session, ...patch }, deps())).rejects.toMatchObject({ code: 'checkout_session_mismatch' });
  });
  it('refuses unrelated Stripe sessions before reading private orders', async () => {
    const d = deps(); await expect(verifyCheckoutSession({ ...session, metadata: {} }, d)).rejects.toMatchObject({ status: 404 });
    expect(d.order).not.toHaveBeenCalled();
  });
  it('keeps database failure visible instead of claiming order recording', async () => {
    const d = deps(); vi.mocked(d.settlement).mockRejectedValue(new Error('database unavailable'));
    await expect(verifyCheckoutSession(session, d)).rejects.toThrow('database unavailable');
  });
});
