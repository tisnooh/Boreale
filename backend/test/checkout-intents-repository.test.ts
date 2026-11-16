import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../src/lib/supabase.js', () => ({ db: () => state }));
import { checkoutIntentsRepo } from '../src/repositories/checkout-intents.js';
const identity = { keyHash: 'a'.repeat(64), requestHash: 'b'.repeat(64), actor: null };
const row = { id: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd7', order_id: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd8', order_number: 'QA',
  request_hash: identity.requestHash, stripe_key: 'stable-key', state: 'prepared', snapshot: { order: {}, items: [], totals: { totalCents: 100, currency: 'EUR' } },
  stripe_params: null, session_id: null, lease_token: null, first_attempt_at: null, retry_deadline: null };
beforeEach(() => { state.rpc.mockReset(); state.from.mockReset(); });
describe('checkout intent persistence fails closed', () => {
  it('allows no-existing lookup only for explicit null result', async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    expect(await checkoutIntentsRepo.begin(identity)).toBeNull();
    expect(state.rpc).toHaveBeenCalledWith('begin_checkout_intent', { p_key_hash: identity.keyHash, p_request_hash: identity.requestHash,
      p_actor: null, p_snapshot: null, p_customer: null });
  });
  it.each([undefined, {}, [], { ...row, state: 'invented' }, { ...row, snapshot: {} }])('rejects malformed acknowledgement %#', async data => {
    state.rpc.mockResolvedValue({ data, error: null });
    await expect(checkoutIntentsRepo.claim(row.id)).rejects.toMatchObject({ code: 'checkout_persistence_unconfirmed' });
  });
  it('maps RPC conflict without leaking its diagnostic', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'private email/address detail' } });
    await expect(checkoutIntentsRepo.begin(identity)).rejects.toMatchObject({ status: 409, code: 'checkout_intent_conflict' });
  });
  it('does not fall back to sequential inserts when RPC is unavailable', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(checkoutIntentsRepo.begin(identity)).rejects.toMatchObject({ status: 503 });
    expect(state.from).not.toHaveBeenCalled();
  });
  it('passes one atomic bind, including explicit null recovery token and uppercase currency', async () => {
    state.rpc.mockResolvedValue({ data: row, error: null });
    await expect(checkoutIntentsRepo.bind(row.id, null, { id: 'cs_test_fixture', url: null, expires_at: 2000000000, amount_total: 100, currency: 'eur' })).resolves.toEqual(row);
    expect(state.rpc).toHaveBeenCalledWith('bind_checkout_session', { p_id: row.id, p_token: null, p_session: 'cs_test_fixture',
      p_url: null, p_expires_at: 2000000000, p_amount: 100, p_currency: 'EUR' });
  });
  it('requires a true failure acknowledgement', async () => {
    state.rpc.mockResolvedValue({ data: false, error: null });
    await expect(checkoutIntentsRepo.fail(row.id, 'lease')).rejects.toMatchObject({ status: 503 });
  });
});
