import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler, Response } from 'express';
import type { AuthedRequest } from '../src/middleware/auth.js';
const state = vi.hoisted(() => ({ enabled: 'true', database: true, stripe: true, webhook: true, checkout: vi.fn(), verify: vi.fn() }));
vi.mock('../src/lib/stripe-environment.js', () => ({ ensureStripeEnvironment: state.verify }));
vi.mock('../src/config.js', () => ({ config: () => ({ CHECKOUT_ENABLED: state.enabled }), features: {
  database: () => state.database, stripe: () => state.stripe, stripeWebhook: () => state.webhook,
} }));
vi.mock('../src/services/checkout.js', () => ({ createCheckout: state.checkout }));
import { checkoutController } from '../src/controllers/checkout.js';
beforeEach(() => {
  state.enabled = 'true'; state.database = state.stripe = state.webhook = true; state.checkout.mockReset();
  state.verify.mockReset().mockResolvedValue({ accountId: 'acct_fixture', livemode: false });
  state.checkout.mockResolvedValue({ url: 'https://checkout.example.invalid', orderId: 'fixture', orderNumber: 'QA', totals: {} });
});
const attempt = { idempotencyKey: '00000000-0000-4000-a000-202611160001', customerMode: 'customer' };
async function call(body: Record<string, unknown> = attempt, user: { sub: string } | null = { sub: 'owner-fixture' }) {
  return new Promise<unknown>(resolve => {
    const response = { status: () => response, json: resolve } as unknown as Response;
    (checkoutController.createCheckout as RequestHandler)({ body, user: user ?? undefined } as AuthedRequest, response, resolve);
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
    expect(state.checkout).toHaveBeenCalledWith(attempt, undefined, 'owner-fixture');
  });
  it('requires durable attempt identity before any commercial work', async () => {
    expect(await call({})).toMatchObject({ status: 400, code: 'checkout_attempt_required' });
    expect(state.checkout).not.toHaveBeenCalled();
  });
  it('never downgrades an expired customer session to guest', async () => {
    expect(await call(attempt, null)).toMatchObject({ status: 401, code: 'checkout_identity_changed' });
    expect(state.checkout).not.toHaveBeenCalled();
  });
  it('rejects silently changing a guest attempt to a signed-in customer', async () => {
    expect(await call({ ...attempt, customerMode: 'guest' })).toMatchObject({ status: 401, code: 'checkout_identity_changed' });
    expect(state.checkout).not.toHaveBeenCalled();
  });
  it('refuses an unverified runtime Stripe account before creating a customer or order', async () => {
    state.verify.mockRejectedValue(new Error('account could not be verified'));
    expect(await call()).toBeInstanceOf(Error); expect(state.checkout).not.toHaveBeenCalled();
  });
});
