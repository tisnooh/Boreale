import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler, Response } from 'express';
import type { AuthedRequest } from '../src/middleware/auth.js';
const state = vi.hoisted(() => ({ enabled: 'true', database: true, stripe: true, webhook: true, checkout: vi.fn() }));
vi.mock('../src/config.js', () => ({ config: () => ({ CHECKOUT_ENABLED: state.enabled }), features: {
  database: () => state.database, stripe: () => state.stripe, stripeWebhook: () => state.webhook,
} }));
vi.mock('../src/services/checkout.js', () => ({ createCheckout: state.checkout }));
import { checkoutController } from '../src/controllers/checkout.js';
beforeEach(() => {
  state.enabled = 'true'; state.database = state.stripe = state.webhook = true; state.checkout.mockReset();
  state.checkout.mockResolvedValue({ url: 'https://checkout.example.invalid', orderId: 'fixture', orderNumber: 'QA', totals: {} });
});
async function call() {
  return new Promise<unknown>(resolve => {
    const response = { status: () => response, json: resolve } as unknown as Response;
    (checkoutController.createCheckout as RequestHandler)({ body: {}, user: { sub: 'owner-fixture' } } as AuthedRequest, response, resolve);
  });
}
describe('checkout dependency gate before commercial writes', () => {
  it('keeps global closed switch authoritative', async () => {
    state.enabled = 'false'; expect(await call()).toMatchObject({ status: 503, code: 'checkout_closed' }); expect(state.checkout).not.toHaveBeenCalled();
  });
  it.each(['database', 'stripe', 'webhook'] as const)('refuses missing %s before customer/order/provider work', async missing => {
    state[missing] = false;
    expect(await call()).toMatchObject({ status: 503, code: 'checkout_dependencies_unavailable' }); expect(state.checkout).not.toHaveBeenCalled();
  });
  it('delegates only when prerequisites are present; provider execution is mocked', async () => {
    expect(await call()).toMatchObject({ data: { orderId: 'fixture' } });
    expect(state.checkout).toHaveBeenCalledWith({}, undefined, 'owner-fixture');
  });
});
