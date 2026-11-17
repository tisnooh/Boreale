import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/services/email.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/services/email.js')>(),
  sendEmail: vi.fn(),
}));
import { buildDefaultWebhookDeps, handleWebhookEvent, type DefaultWebhookRepos, type StripeEventLike, type WebhookDeps } from '../src/services/webhooks.js';
import { AppError } from '../src/lib/errors.js';
import type { PaymentSettlement, RecordedRefund } from '../src/repositories/orders.js';
import { sendEmail } from '../src/services/email.js';

const refund: RecordedRefund = { order_id: 'order-1', payment_id: 'payment-1', observed_refunded_cents: 6760, reconciliation_required: true as const, duplicate: false, changed: true };
const settlement: PaymentSettlement = { order_id: 'order-1', duplicate: false, fulfillment_status: 'ready', incident_code: null };
const paidOrder = { id: 'order-1', number: 'BOR-2026-000001', status: 'pending', email: 'client@example.fr', total_cents: 6760, currency: 'EUR', discount_code: 'WELCOME10' };

function makeDeps(order: Record<string, unknown> | null = paidOrder) {
  const deps: WebhookDeps = {
    getOrderBySessionId: vi.fn(async () => order as never),
    settlePayment: vi.fn(async () => settlement),
    cancelOrder: vi.fn(async () => true),
    handleRefund: vi.fn(async () => refund),
    markPaymentFailed: vi.fn(async () => undefined),
  };
  return deps;
}

function paidEvent(object: Record<string, unknown> = {}, event: Partial<StripeEventLike> = {}): StripeEventLike {
  return { id: 'evt_test_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 6760, currency: 'eur', payment_intent: 'pi_1', ...object } }, ...event };
}

describe('webhook paid checkout transaction', () => {
  it.each([{ amount_total: 1 }, { currency: 'usd' }, { amount_total: undefined }, { amount_total: 6760.5 }, { amount_total: -1 }, { currency: undefined }, { currency: 'EURO' }])('rejects invalid payment before settlement %j', async (payment) => {
    const deps = makeDeps();
    await expect(handleWebhookEvent(paidEvent(payment), deps)).rejects.toMatchObject({ code: 'payment_amount_mismatch' });
    expect(deps.settlePayment).not.toHaveBeenCalled();
  });

  it.each([
    { event: { id: undefined }, object: {} },
    { event: { id: ' ' }, object: {} },
    { event: {}, object: { id: '' } },
    { event: {}, object: { id: 42 } },
    { event: {}, object: { payment_intent: null } },
    { event: {}, object: { payment_intent: {} } },
    { event: {}, object: { payment_intent: ' ' } },
    { event: {}, object: { payment_intent: { id: 42 } } },
  ])('requires durable provider identities before any lookup %j', async ({ event, object }) => {
    const deps = makeDeps();
    await expect(handleWebhookEvent(paidEvent(object, event), deps)).rejects.toMatchObject({ code: 'payment_identity_missing' });
    expect(deps.getOrderBySessionId).not.toHaveBeenCalled();
    expect(deps.settlePayment).not.toHaveBeenCalled();
  });

  it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])('settles %s in one operation', async (type) => {
    const deps = makeDeps();
    await expect(handleWebhookEvent(paidEvent({}, { type }), deps)).resolves.toEqual({ handled: true, type });
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
    expect(deps.settlePayment).toHaveBeenCalledWith({ eventId: 'evt_test_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1', amountCents: 6760, currency: 'EUR' });
  });

  it('accepts expanded payment-intent identity', async () => {
    const deps = makeDeps();
    await handleWebhookEvent(paidEvent({ payment_intent: { id: 'pi_expanded' } }), deps);
    expect(deps.settlePayment).toHaveBeenCalledWith(expect.objectContaining({ paymentIntentId: 'pi_expanded' }));
  });

  it('delegates duplicate detection to the database even when order already paid', async () => {
    const deps = makeDeps({ ...paidOrder, status: 'paid' });
    vi.mocked(deps.settlePayment).mockResolvedValue({ ...settlement, duplicate: true });
    await expect(handleWebhookEvent(paidEvent(), deps)).resolves.toMatchObject({ handled: true });
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
    expect(deps.cancelOrder).not.toHaveBeenCalled();
    expect(deps.handleRefund).not.toHaveBeenCalled();
  });

  it('records a paid cancelled order through settlement for incident reconciliation', async () => {
    const deps = makeDeps({ ...paidOrder, status: 'cancelled' });
    vi.mocked(deps.settlePayment).mockResolvedValue({ ...settlement, fulfillment_status: 'blocked', incident_code: 'payment_after_cancellation' });
    await expect(handleWebhookEvent(paidEvent(), deps)).resolves.toMatchObject({ handled: true });
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
  });

  it('acknowledges durable stock incident without pretending fulfillment is ready', async () => {
    const deps = makeDeps();
    vi.mocked(deps.settlePayment).mockResolvedValue({ ...settlement, fulfillment_status: 'blocked', incident_code: 'insufficient_stock' });
    await expect(handleWebhookEvent(paidEvent(), deps)).resolves.toMatchObject({ handled: true });
    expect(deps.settlePayment).toHaveBeenCalledTimes(1);
  });

  it('propagates transaction failure so the provider can retry', async () => {
    const deps = makeDeps();
    const error = new Error('transaction unavailable');
    vi.mocked(deps.settlePayment).mockRejectedValueOnce(error).mockResolvedValueOnce(settlement);
    await expect(handleWebhookEvent(paidEvent(), deps)).rejects.toBe(error);
    await expect(handleWebhookEvent(paidEvent(), deps)).resolves.toMatchObject({ handled: true });
    expect(deps.settlePayment).toHaveBeenCalledTimes(2);
  });

  it('ignores unpaid sessions without requiring successful-payment identities', async () => {
    const deps = makeDeps();
    await expect(handleWebhookEvent(paidEvent({ payment_status: 'unpaid', payment_intent: null }, { id: undefined }), deps)).resolves.toMatchObject({ handled: false });
    expect(deps.getOrderBySessionId).not.toHaveBeenCalled();
    expect(deps.settlePayment).not.toHaveBeenCalled();
  });

  it('keeps unknown paid session retryable without any settlement', async () => {
    const deps = makeDeps(null);
    await expect(handleWebhookEvent(paidEvent(), deps)).rejects.toMatchObject({ status: 503, code: 'payment_order_unresolved' });
    expect(deps.settlePayment).not.toHaveBeenCalled();
  });

  it('default wiring invokes only settlement for success, with no separate writes or email', async () => {
    const repos = { ordersRepo: {
      getBySessionId: vi.fn(async () => paidOrder), settlePayment: vi.fn(async () => settlement), cancelPending: vi.fn(),
      addEvent: vi.fn(), updatePaymentBySession: vi.fn(), recordRefund: vi.fn(async () => refund),
    } } satisfies DefaultWebhookRepos;
    await handleWebhookEvent(paidEvent(), buildDefaultWebhookDeps(repos));
    expect(repos.ordersRepo.settlePayment).toHaveBeenCalledTimes(1);
    expect(repos.ordersRepo.addEvent).not.toHaveBeenCalled();
    expect(repos.ordersRepo.updatePaymentBySession).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('webhook expiration / refund (existing paths)', () => {
  it('keeps an early expiration retryable instead of silently losing it', async () => {
    const deps = makeDeps(null);
    await expect(handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, deps))
      .rejects.toMatchObject({ status: 503, code: 'payment_order_unresolved' });
    expect(deps.cancelOrder).not.toHaveBeenCalled();
  });
  it('recovers early binding before settling a paid order', async () => {
    const deps = makeDeps(null); deps.recoverCheckoutSession = vi.fn().mockResolvedValue(paidOrder);
    await expect(handleWebhookEvent(paidEvent(), deps)).resolves.toMatchObject({ handled: true });
    expect(deps.recoverCheckoutSession).toHaveBeenCalledOnce(); expect(deps.settlePayment).toHaveBeenCalledOnce();
  });
  it('expires a pending order', async () => {
    const deps = makeDeps();
    await handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, deps);
    expect(deps.cancelOrder).toHaveBeenCalledWith('order-1', 'checkout.session.expired');
  });

  it('does not cancel a paid order', async () => {
    const deps = makeDeps({ ...paidOrder, status: 'paid' });
    await handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, deps);
    expect(deps.cancelOrder).not.toHaveBeenCalled();
  });

  it('uses atomic pending cancellation when lookup becomes stale', async () => {
    const repos = { ordersRepo: {
      getBySessionId: vi.fn(async () => paidOrder), settlePayment: vi.fn(), cancelPending: vi.fn(async () => false),
      addEvent: vi.fn(), updatePaymentBySession: vi.fn(), recordRefund: vi.fn(async () => refund),
    } } satisfies DefaultWebhookRepos;
    await expect(handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, buildDefaultWebhookDeps(repos))).resolves.toMatchObject({ handled: true });
    expect(repos.ordersRepo.cancelPending).toHaveBeenCalledWith('order-1', 'checkout.session.expired');
    expect(repos.ordersRepo.addEvent).not.toHaveBeenCalled();
  });

  it('passes validated cumulative refund identity to the atomic handler', async () => {
    const deps = makeDeps(null);
    await handleWebhookEvent({ id: 'evt_refund_1', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount: 6760, amount_refunded: 6760, currency: 'eur' } } }, deps);
    expect(deps.handleRefund).toHaveBeenCalledWith({ eventId: 'evt_refund_1', chargeId: 'ch_1', paymentIntentId: 'pi_1', amountCents: 6760, refundedCents: 6760, currency: 'EUR' });
  });

  it('keeps an early refund retryable until payment is associated', async () => {
    const repos = { ordersRepo: {
      getBySessionId: vi.fn(), settlePayment: vi.fn(), cancelPending: vi.fn(),
      addEvent: vi.fn(), updatePaymentBySession: vi.fn(), recordRefund: vi.fn(async () => { throw AppError.serviceUnavailable('refund_payment_unresolved'); }),
    } } satisfies DefaultWebhookRepos;
    await expect(handleWebhookEvent({ id: 'evt_refund_1', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount: 6760, amount_refunded: 6760, currency: 'eur' } } }, buildDefaultWebhookDeps(repos))).rejects.toMatchObject({ status: 503, code: 'refund_payment_unresolved' });
    expect(repos.ordersRepo.recordRefund).toHaveBeenCalledOnce();
  });

  it('retains payment failure event handling', async () => {
    const deps = makeDeps(null);
    await handleWebhookEvent({ type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1', metadata: { orderId: 'order-1' } } } }, deps);
    expect(deps.markPaymentFailed).toHaveBeenCalledWith('order-1', null);
  });

  it('ignores unknown event types', async () => {
    const deps = makeDeps(null);
    await expect(handleWebhookEvent({ type: 'invoice.paid', data: { object: {} } }, deps)).resolves.toMatchObject({ handled: false });
    expect(deps.settlePayment).not.toHaveBeenCalled();
  });
});
