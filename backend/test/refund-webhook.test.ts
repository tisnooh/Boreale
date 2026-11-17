import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn() }));
import { sendEmail } from '../src/services/email.js';
import { buildDefaultWebhookDeps, handleWebhookEvent, type StripeEventLike } from '../src/services/webhooks.js';
import { AppError } from '../src/lib/errors.js';
import type { RecordedRefund } from '../src/repositories/orders.js';

const result: RecordedRefund = { order_id: 'order-qa', payment_id: 'payment-qa', observed_refunded_cents: 1000, reconciliation_required: true as const, duplicate: false, changed: true };
function event(object: Record<string, unknown> = {}, id: unknown = 'evt_QARefund'): StripeEventLike {
  return { id, type: 'charge.refunded', data: { object: { id: 'ch_QARefund', payment_intent: 'pi_QARefund',
    amount: 1000, amount_refunded: 1000, currency: 'eur', ...object } } } as StripeEventLike;
}
function fixture() {
  const ordersRepo = { getBySessionId: vi.fn(), settlePayment: vi.fn(), cancelPending: vi.fn(),
    addEvent: vi.fn(), updatePaymentBySession: vi.fn(), recordRefund: vi.fn(async () => result) };
  return { ordersRepo, deps: buildDefaultWebhookDeps({ ordersRepo }) };
}
beforeEach(() => vi.clearAllMocks());
describe('refund webhook records observations through one transaction; no provider/email', () => {
  it('passes a complete signed-event identity and cumulative amount to exactly one repository operation', async () => {
    const { ordersRepo, deps } = fixture();
    await expect(handleWebhookEvent(event(), deps)).resolves.toEqual({ handled: true, type: 'charge.refunded' });
    expect(ordersRepo.recordRefund).toHaveBeenCalledOnce();
    expect(ordersRepo.recordRefund).toHaveBeenCalledWith({ eventId: 'evt_QARefund', chargeId: 'ch_QARefund', paymentIntentId: 'pi_QARefund',
      amountCents: 1000, refundedCents: 1000, currency: 'EUR' });
    expect(ordersRepo.getBySessionId).not.toHaveBeenCalled(); expect(ordersRepo.settlePayment).not.toHaveBeenCalled();
    expect(ordersRepo.addEvent).not.toHaveBeenCalled(); expect(ordersRepo.updatePaymentBySession).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it.each([undefined, '', ' ', 'bad', 10, 'evt_' + 'a'.repeat(200)])('requires event id %# before transaction', async id => {
    const { ordersRepo, deps } = fixture();
    await expect(handleWebhookEvent({ ...event(), id: id as string | undefined }, deps)).rejects.toMatchObject({ code: 'refund_identity_missing' });
    expect(ordersRepo.recordRefund).not.toHaveBeenCalled();
  });
  it.each([{ id: undefined }, { id: '' }, { id: 'cs_wrong' }, { payment_intent: null }, { payment_intent: {} }, { payment_intent: { id: 12 } }])('requires charge and payment identity %#', async object => {
    const { ordersRepo, deps } = fixture();
    await expect(handleWebhookEvent(event(object), deps)).rejects.toMatchObject({ code: 'refund_identity_missing' });
    expect(ordersRepo.recordRefund).not.toHaveBeenCalled();
  });
  it.each([{ amount: undefined }, { amount: 0 }, { amount: -1 }, { amount: 1000.5 }, { amount: 2147483648 },
    { amount_refunded: undefined }, { amount_refunded: 0 }, { amount_refunded: -1 }, { amount_refunded: 1001 }, { amount_refunded: 20.5 },
    { currency: undefined }, { currency: 'EURO' }])('never invents a refund total/currency for malformed input %#', async object => {
    const { ordersRepo, deps } = fixture();
    await expect(handleWebhookEvent(event(object), deps)).rejects.toMatchObject({ code: 'refund_amount_mismatch' });
    expect(ordersRepo.recordRefund).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
  });
  it('accepts expanded payment intent and forwards partial amounts unchanged', async () => {
    const { ordersRepo, deps } = fixture();
    await handleWebhookEvent(event({ payment_intent: { id: 'pi_QARefund' }, amount_refunded: 250 }), deps);
    expect(ordersRepo.recordRefund).toHaveBeenCalledWith(expect.objectContaining({ paymentIntentId: 'pi_QARefund', refundedCents: 250 }));
  });
  it('keeps early/unsettled payment retryable and never emails after a persistence failure', async () => {
    const { ordersRepo, deps } = fixture();
    ordersRepo.recordRefund.mockRejectedValue(AppError.serviceUnavailable('refund_payment_unresolved'));
    await expect(handleWebhookEvent(event(), deps)).rejects.toMatchObject({ status: 503, code: 'refund_payment_unresolved' });
    expect(sendEmail).not.toHaveBeenCalled(); expect(ordersRepo.addEvent).not.toHaveBeenCalled();
  });
  it('delegates replay and full-to-stale cumulative decisions to the database without extra writes', async () => {
    const { ordersRepo, deps } = fixture();
    await handleWebhookEvent(event(), deps);
    ordersRepo.recordRefund.mockResolvedValue({ ...result, duplicate: true, changed: false });
    await handleWebhookEvent(event(), deps);
    await handleWebhookEvent(event({ amount_refunded: 250 }, 'evt_QAStale'), deps);
    expect(ordersRepo.recordRefund).toHaveBeenLastCalledWith(expect.objectContaining({ eventId: 'evt_QAStale', refundedCents: 250 }));
    expect(ordersRepo.addEvent).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
  });
});
