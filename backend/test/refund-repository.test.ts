import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../src/lib/supabase.js', () => ({ db: () => state }));
import { ordersRepo } from '../src/repositories/orders.js';
const input = { eventId: 'evt_QARefund', chargeId: 'ch_QARefund', paymentIntentId: 'pi_QARefund', amountCents: 1000, refundedCents: 250, currency: 'EUR' };
const result = { order_id: 'order-qa', payment_id: 'payment-qa', observed_refunded_cents: 250, reconciliation_required: true as const, duplicate: false, changed: true };
beforeEach(() => { state.rpc.mockReset(); state.from.mockReset(); });
describe('refund repository single-RPC boundary', () => {
  it('records all identity, currency and cumulative amount through one private RPC', async () => {
    state.rpc.mockResolvedValue({ data: result, error: null });
    expect(await ordersRepo.recordRefund(input)).toEqual(result);
    expect(state.rpc).toHaveBeenCalledWith('record_order_refund', { p_event_id: input.eventId, p_charge_id: input.chargeId,
      p_payment_intent_id: input.paymentIntentId, p_amount_cents: 1000, p_refunded_cents: 250, p_currency: 'EUR' });
    expect(state.from).not.toHaveBeenCalled();
  });
  it.each(['23514', '23505'])('sanitizes conflicting event/charge/payment diagnostic %s', async code => {
    state.rpc.mockResolvedValue({ data: null, error: { code, message: 'private provider diagnostic' } });
    await expect(ordersRepo.recordRefund(input)).rejects.toMatchObject({ status: 409, code: 'refund_conflict' });
    expect(state.from).not.toHaveBeenCalled();
  });
  it.each(['P0002', 'PGRST202', '08006'])('keeps unavailable/unsettled persistence retryable without fallback %s', async code => {
    state.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(ordersRepo.recordRefund(input)).rejects.toMatchObject({ status: 503 }); expect(state.from).not.toHaveBeenCalled();
  });
  it.each([null, {}, { ...result, changed: undefined }, { ...result, duplicate: 'yes' }, { ...result, observed_refunded_cents: 0 },
    { ...result, observed_refunded_cents: 1001 }, { ...result, observed_refunded_cents: 20.5 }, { ...result, reconciliation_required: false }])('refuses malformed persistence acknowledgement %#', async data => {
    state.rpc.mockResolvedValue({ data, error: null });
    await expect(ordersRepo.recordRefund(input)).rejects.toMatchObject({ code: 'refund_recording_unconfirmed' });
  });
  it('accepts the observation maximum returned for a stale partial without a financial status', async () => {
    state.rpc.mockResolvedValue({ data: { ...result, observed_refunded_cents: 1000, reconciliation_required: true as const, duplicate: false, changed: false }, error: null });
    await expect(ordersRepo.recordRefund(input)).resolves.toMatchObject({ observed_refunded_cents: 1000, reconciliation_required: true as const, changed: false });
  });
});
