import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ environment: vi.fn(), create: vi.fn(), retrieve: vi.fn() }));
vi.mock('../src/lib/stripe-environment.js', () => ({ ensureStripeEnvironment: state.environment }));
vi.mock('../src/lib/stripe.js', () => ({ stripe: () => ({ checkout: { sessions: { create: state.create, retrieve: state.retrieve } } }) }));
import { defaultCheckoutIntentDeps } from '../src/services/checkout-intents.js';
const params = { mode: 'payment' as const, metadata: { stripeAccountId: 'acct_isolated_fixture', stripeMode: 'test' } };
beforeEach(() => {
  state.environment.mockReset().mockResolvedValue({ accountId: 'acct_isolated_fixture', livemode: false });
  state.create.mockReset().mockResolvedValue({ id: 'cs_test_fixture', livemode: false });
  state.retrieve.mockReset().mockResolvedValue({ id: 'cs_test_fixture', livemode: false, metadata: params.metadata });
});
describe('durable provider account boundary (SDK/environment mocked, no external requests)', () => {
  it('verifies environment and sends exact frozen body/key with bounded SDK options', async () => {
    await defaultCheckoutIntentDeps.create(params, 'stable-provider-key');
    expect(state.environment).toHaveBeenCalledTimes(1);
    expect(state.create).toHaveBeenCalledWith(params, { idempotencyKey: 'stable-provider-key', timeout: 10000, maxNetworkRetries: 0 });
  });
  it.each<Record<string, string>>([{ stripeAccountId: 'acct_changed', stripeMode: 'test' }, { stripeAccountId: 'acct_isolated_fixture', stripeMode: 'live' }, {}])('refuses changed/missing frozen scope before POST %#', async metadata => {
    await expect(defaultCheckoutIntentDeps.create({ ...params, metadata }, 'stable-key')).rejects.toMatchObject({ code: 'checkout_provider_scope_changed' });
    expect(state.create).not.toHaveBeenCalled();
  });
  it('does not call create/retrieve if environment verification fails', async () => {
    state.environment.mockRejectedValue(new Error('environment unavailable'));
    await expect(defaultCheckoutIntentDeps.create(params, 'key')).rejects.toThrow('environment unavailable');
    await expect(defaultCheckoutIntentDeps.retrieve('cs_test_fixture')).rejects.toThrow('environment unavailable');
    expect(state.create).not.toHaveBeenCalled(); expect(state.retrieve).not.toHaveBeenCalled();
  });
  it('refuses a create acknowledgement from live mode', async () => {
    state.create.mockResolvedValue({ id: 'cs_live_wrong', livemode: true });
    await expect(defaultCheckoutIntentDeps.create(params, 'key')).rejects.toMatchObject({ code: 'checkout_provider_scope_changed' });
  });
  it('verifies mode and account metadata before returning a recovered session', async () => {
    await expect(defaultCheckoutIntentDeps.retrieve('cs_test_fixture')).resolves.toMatchObject({ id: 'cs_test_fixture' });
    state.retrieve.mockResolvedValue({ id: 'cs_test_fixture', livemode: true, metadata: params.metadata });
    await expect(defaultCheckoutIntentDeps.retrieve('cs_test_fixture')).rejects.toMatchObject({ code: 'checkout_provider_scope_changed' });
    state.retrieve.mockResolvedValue({ id: 'cs_test_fixture', livemode: false, metadata: { ...params.metadata, stripeAccountId: 'acct_changed' } });
    await expect(defaultCheckoutIntentDeps.retrieve('cs_test_fixture')).rejects.toMatchObject({ code: 'checkout_provider_scope_changed' });
  });
});
