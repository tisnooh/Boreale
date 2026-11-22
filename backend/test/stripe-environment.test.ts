import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ key: 'rk_test_fixture', account: 'acct_fixture', mode: 'test', retrieve: vi.fn() }));
vi.mock('../src/config.js', () => ({ config: () => ({ STRIPE_SECRET_KEY: state.key, STRIPE_ACCOUNT_ID: state.account, STRIPE_MODE: state.mode }) }));
vi.mock('../src/lib/stripe.js', () => ({ stripe: () => ({ accounts: { retrieve: state.retrieve } }) }));
import { ensureStripeEnvironment } from '../src/lib/stripe-environment.js';
let sequence = 0;
beforeEach(() => {
  state.key = `rk_test_fixture_${++sequence}`; state.account = 'acct_fixture'; state.mode = 'test';
  state.retrieve.mockReset().mockResolvedValue({ id: 'acct_fixture' });
});
describe('runtime Stripe environment pinning (provider mocked)', () => {
  it('requires secure runtime configuration even when the plugin works', async () => {
    state.key = ''; await expect(ensureStripeEnvironment()).rejects.toMatchObject({ code: 'stripe_environment_required' });
    expect(state.retrieve).not.toHaveBeenCalled();
  });
  it('refuses a live key in test mode before any provider request', async () => {
    state.key = 'rk_live_fixture'; await expect(ensureStripeEnvironment()).rejects.toMatchObject({ code: 'stripe_key_mode_mismatch' });
    expect(state.retrieve).not.toHaveBeenCalled();
  });
  it('checks the actual account and shares the verification across concurrent requests', async () => {
    const results = await Promise.all([ensureStripeEnvironment(), ensureStripeEnvironment()]);
    expect(results).toEqual([{ accountId: 'acct_fixture', livemode: false }, { accountId: 'acct_fixture', livemode: false }]);
    expect(state.retrieve).toHaveBeenCalledTimes(1);
  });
  it('refuses a key attached to a different account', async () => {
    state.retrieve.mockResolvedValue({ id: 'acct_other' });
    await expect(ensureStripeEnvironment()).rejects.toMatchObject({ code: 'stripe_account_mismatch' });
  });
  it('does not retain failed verification or disclose provider diagnostics', async () => {
    state.retrieve.mockRejectedValueOnce(new Error('private diagnostic'));
    await expect(ensureStripeEnvironment()).rejects.toMatchObject({ code: 'stripe_account_unverified' });
    await expect(ensureStripeEnvironment()).resolves.toMatchObject({ accountId: 'acct_fixture' });
    expect(state.retrieve).toHaveBeenCalledTimes(2);
  });
  it('rechecks identity after key or account changes', async () => {
    await ensureStripeEnvironment(); state.account = 'acct_other'; state.retrieve.mockResolvedValue({ id: 'acct_other' });
    await expect(ensureStripeEnvironment()).resolves.toMatchObject({ accountId: 'acct_other' });
    expect(state.retrieve).toHaveBeenCalledTimes(2);
  });
});
