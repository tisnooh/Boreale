import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
const single = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/supabase.js', () => ({ db: () => ({ rpc, from }) }));
import { ordersRepo, type NewOrderInput } from '../src/repositories/orders.js';

const input: NewOrderInput = {
  customerId: 'customer-1', userId: null, email: 'client@example.invalid', currency: 'EUR',
  subtotalCents: 2000, discountCents: 0, shippingCents: 490, totalCents: 2490,
  shippingMethod: 'standard', discountCode: null,
  shippingAddress: { firstName: 'QA', lastName: 'Client', line1: '1 rue', postalCode: '75001', city: 'Paris', country: 'FR' },
  items: [{ variant_id: 'variant-1', sku: 'QA', product_name: 'QA', variant_title: null, unit_price_cents: 1000, quantity: 2, total_cents: 2000, image_url: null }],
};
const payment = { eventId: 'evt_test_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1', amountCents: 2490, currency: 'EUR' };
const settlement = { order_id: 'order-1', duplicate: false, fulfillment_status: 'ready', incident_code: null };

beforeEach(() => { vi.resetAllMocks(); });

describe('atomic order repository', () => {
  it('creates order, snapshots and event through a single RPC', async () => {
    const order = { id: 'order-1', number: 'BOR-1', total_cents: 2490 };
    rpc.mockReturnValue({ single });
    single.mockResolvedValue({ data: order, error: null });
    await expect(ordersRepo.create(input)).resolves.toEqual(order);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('create_order_atomic', { p_input: input });
    expect(from).not.toHaveBeenCalled();
  });

  it('fails closed when atomic migration is missing', async () => {
    rpc.mockReturnValue({ single });
    single.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'RPC not found' } });
    await expect(ordersRepo.create(input)).rejects.toMatchObject({ status: 503, code: 'order_creation_failed' });
    expect(from).not.toHaveBeenCalled();
  });

  it('does not report a created order when the response is absent', async () => {
    rpc.mockReturnValue({ single });
    single.mockResolvedValue({ data: null, error: null });
    await expect(ordersRepo.create(input)).rejects.toMatchObject({ status: 503, code: 'order_creation_unconfirmed' });
    expect(from).not.toHaveBeenCalled();
  });

  it('settles payment with the exact SQL parameter contract', async () => {
    rpc.mockResolvedValue({ data: settlement, error: null });
    await expect(ordersRepo.settlePayment(payment)).resolves.toEqual(settlement);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('settle_order_payment', {
      p_event_id: payment.eventId, p_session_id: payment.sessionId, p_payment_intent_id: payment.paymentIntentId,
      p_amount_cents: payment.amountCents, p_currency: payment.currency,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['PGRST202', '40001', '23505'])('keeps RPC error %s retryable without separate writes', async (code) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(ordersRepo.settlePayment(payment)).rejects.toMatchObject({ status: 503, code: 'payment_settlement_failed' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([null, {}, { ...settlement, duplicate: undefined }, { ...settlement, fulfillment_status: 'pending' }, { ...settlement, incident_code: 123 }])('rejects an unconfirmed settlement result %j', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(ordersRepo.settlePayment(payment)).rejects.toMatchObject({ status: 503, code: 'payment_settlement_unconfirmed' });
  });

  it('returns durable blocked-fulfillment incidents without a second mutation', async () => {
    const blocked = { ...settlement, fulfillment_status: 'blocked', incident_code: 'insufficient_stock' };
    rpc.mockResolvedValue({ data: blocked, error: null });
    await expect(ordersRepo.settlePayment(payment)).resolves.toEqual(blocked);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([true, false])('delegates conditional cancellation to its transaction, result %s', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(ordersRepo.cancelPending('order-1', 'checkout.session.expired')).resolves.toBe(data);
    expect(rpc).toHaveBeenCalledWith('cancel_pending_order', { p_order_id: 'order-1', p_reason: 'checkout.session.expired' });
    expect(from).not.toHaveBeenCalled();
  });

  it('keeps failed cancellation retryable without unguarded status writes', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(ordersRepo.cancelPending('order-1', 'expired')).rejects.toMatchObject({ status: 503, code: 'order_cancellation_unconfirmed' });
    expect(from).not.toHaveBeenCalled();
  });
});
