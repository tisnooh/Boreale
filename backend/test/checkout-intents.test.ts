import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutIdentity, runDurableCheckout, type CheckoutIntentDeps, type IntentSession } from '../src/services/checkout-intents.js';
import { buildIntentStripeParams, createCheckout } from '../src/services/checkout.js';
import type { CheckoutInput } from '../src/validators/checkout.js';
import type { CheckoutIntent, CheckoutSnapshot } from '../src/repositories/checkout-intents.js';

const input: CheckoutInput = { idempotencyKey: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd5', customerMode: 'guest',
  items: [{ variantId: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd6', quantity: 1 }], shippingMethod: 'standard',
  customer: { email: 'buyer@example.invalid', firstName: 'QA', lastName: 'Only', address: { line1: '12 rue QA', postalCode: '75001', city: 'Paris', country: 'FR' } } };
const snapshot: CheckoutSnapshot = { totals: { currency: 'EUR', subtotalCents: 100, shippingCents: 0, discountCents: 0, totalCents: 100 },
  items: [{ variantId: input.items[0]!.variantId, sku: 'QA', productName: 'Fixture', variantTitle: '', unitPriceCents: 100, quantity: 1, imageUrl: null }],
  order: { email: input.customer.email, currency: 'EUR', subtotalCents: 100, discountCents: 0, shippingCents: 0, totalCents: 100,
    shippingMethod: 'standard', discountCode: null, shippingAddress: { firstName: 'QA', lastName: 'Only', ...input.customer.address },
    items: [{ variant_id: input.items[0]!.variantId, sku: 'QA', product_name: 'Fixture', variant_title: null, unit_price_cents: 100, quantity: 1, total_cents: 100, image_url: null }] } };
const now = Date.UTC(2026, 10, 16);
let current: CheckoutIntent | null;
const quote = vi.fn(async () => snapshot);
const params = vi.fn(buildIntentStripeParams);
function fixture(): CheckoutIntent {
  return { id: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd7', order_id: '8bd3a910-e23e-4cd0-8df7-92bcb37b5dd8', order_number: 'QA',
    request_hash: checkoutIdentity(input, null).requestHash, state: 'prepared', snapshot,
    stripe_key: 'boreale-checkout/private-fixture/v1', stripe_params: null, session_id: null, lease_token: null,
    first_attempt_at: null, retry_deadline: null };
}
function session(overrides: Partial<IntentSession> = {}): IntentSession {
  return { id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/fixture', status: 'open', expires_at: Math.floor(now / 1000) + 86400,
    amount_total: 100, currency: 'eur', metadata: { brand: 'boreale', checkoutIntentId: fixture().id, orderId: fixture().order_id }, ...overrides };
}
function deps(): CheckoutIntentDeps {
  return {
    begin: vi.fn(async (_identity, prepared) => { if (!current && prepared) current = fixture(); return current; }),
    freeze: vi.fn(async (_id, body) => { current = { ...current!, stripe_params: body }; return current; }),
    claim: vi.fn(async () => { current = { ...current!, state: 'creating', lease_token: 'lease-fixture', retry_deadline: new Date(now + 23 * 3600000).toISOString() }; return current; }),
    bind: vi.fn(async (_id, _token, s) => { current = { ...current!, state: 'bound', session_id: s.id, lease_token: null }; return current; }),
    fail: vi.fn(async () => { current = { ...current!, state: 'prepared', lease_token: null }; }),
    create: vi.fn(async () => session()), retrieve: vi.fn(async () => session()), now: () => now,
  };
}
beforeEach(() => { current = null; quote.mockClear(); params.mockClear(); });
describe('durable checkout service (isolated provider/repository fakes)', () => {
  it('fails closed without runtime key, before any dependency access', async () => {
    await expect(createCheckout({ ...input, idempotencyKey: undefined, customerMode: undefined })).rejects.toMatchObject({ code: 'checkout_identity_required' });
  });
  it('checks identity before any read or quote; never silently changes customer into guest', async () => {
    const d = deps();
    await expect(runDurableCheckout({ ...input, customerMode: 'customer' }, null, quote, params, d)).rejects.toMatchObject({ status: 401 });
    await expect(runDurableCheckout(input, 'user-fixture', quote, params, d)).rejects.toMatchObject({ status: 401 });
    expect(d.begin).not.toHaveBeenCalled(); expect(quote).not.toHaveBeenCalled();
  });
  it('normalizes sorted/merged items and discount casing but scopes actor separately', () => {
    const a = checkoutIdentity({ ...input, discountCode: ' test ', items: [{ ...input.items[0]!, quantity: 2 }] }, null);
    const b = checkoutIdentity({ ...input, discountCode: 'TEST', items: [input.items[0]!, input.items[0]!] }, null);
    expect(a).toEqual(b); expect(a.keyHash).not.toContain(input.idempotencyKey!); expect(a.requestHash).not.toContain(input.customer.email);
    expect(checkoutIdentity({ ...input, customerMode: 'customer' }, 'customer-1').actor).toBe('customer-1');
  });
  it('looks up before quote, creates one intent, freezes complete payload without dynamic expiry', async () => {
    const d = deps(); const result = await runDurableCheckout(input, null, quote, params, d);
    expect(d.begin).toHaveBeenNthCalledWith(1, checkoutIdentity(input, null));
    expect(d.begin).toHaveBeenNthCalledWith(2, checkoutIdentity(input, null), snapshot, input.customer);
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ checkoutIntentId: current!.id }) }), current!.stripe_key);
    expect(vi.mocked(d.create).mock.calls[0]![0]).not.toHaveProperty('expires_at');
    expect(result).toMatchObject({ orderId: fixture().order_id, totals: snapshot.totals });
  });
  it('returns existing snapshot only after retrieving current open session, without repricing', async () => {
    current = { ...fixture(), state: 'bound', session_id: 'cs_test_fixture' }; const d = deps();
    await runDurableCheckout(input, null, quote, params, d);
    expect(d.retrieve).toHaveBeenCalledWith('cs_test_fixture'); expect(quote).not.toHaveBeenCalled(); expect(d.create).not.toHaveBeenCalled();
  });
  it('rejects changed body against existing key before repricing or provider work', async () => {
    current = fixture(); const d = deps();
    await expect(runDurableCheckout({ ...input, shippingMethod: 'express' }, null, quote, params, d)).rejects.toMatchObject({ status: 409 });
    expect(quote).not.toHaveBeenCalled(); expect(d.create).not.toHaveBeenCalled();
  });
  it('retries ambiguous creation with exact persisted params/key, one quote and one freeze', async () => {
    const d = deps(); vi.mocked(d.create).mockRejectedValueOnce(new Error('private provider error'));
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ code: 'checkout_provider_unconfirmed' });
    await runDurableCheckout(input, null, quote, params, d);
    expect(vi.mocked(d.create).mock.calls[0]).toEqual(vi.mocked(d.create).mock.calls[1]);
    expect(quote).toHaveBeenCalledTimes(1); expect(d.freeze).toHaveBeenCalledTimes(1); expect(d.fail).toHaveBeenCalledTimes(1);
  });
  it('does not release uncertain bind acknowledgement or return a URL', async () => {
    const d = deps(); vi.mocked(d.bind).mockRejectedValue(new Error('DB ack unavailable'));
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toThrow('DB ack unavailable');
    expect(d.fail).not.toHaveBeenCalled(); expect(current!.stripe_params).not.toBeNull();
  });
  it.each(['complete', 'expired'])('never creates a new payment for retrieved %s session', async status => {
    current = { ...fixture(), state: 'bound', session_id: 'cs_test_fixture' }; const d = deps(); vi.mocked(d.retrieve).mockResolvedValue(session({ status }));
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ code: status === 'expired' ? 'checkout_session_expired' : 'checkout_session_closed' });
    expect(d.create).not.toHaveBeenCalled();
  });
  it.each([{ expires_at: 0 }, { expires_at: NaN }, { status: null }, { url: 'https://checkout.stripe.com.attacker.invalid/pay' }, { url: 'http://checkout.stripe.com/pay' }, { url: 'https://user@checkout.stripe.com/pay' }])('refuses unverified/expired session or unsafe redirect %#', async override => {
    current = { ...fixture(), state: 'bound', session_id: 'cs_test_fixture' }; const d = deps(); vi.mocked(d.retrieve).mockResolvedValue(session(override));
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ status: 503 });
    expect(d.create).not.toHaveBeenCalled();
  });
  it.each([{ amount_total: 101 }, { currency: 'usd' }, { metadata: {} }, { id: 'cs_test_other' }])('rejects mismatched recovered session %#', async override => {
    current = { ...fixture(), state: 'bound', session_id: 'cs_test_fixture' }; const d = deps(); vi.mocked(d.retrieve).mockResolvedValue(session(override));
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ code: 'checkout_session_mismatch' });
  });
  it('does not create after manual review or an elapsed/unknown retry deadline', async () => {
    current = { ...fixture(), state: 'manual_review' }; const d = deps();
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ code: 'checkout_reconciliation_required' });
    current = { ...fixture(), stripe_params: buildIntentStripeParams(fixture()) };
    vi.mocked(d.claim).mockResolvedValue({ ...current, lease_token: 'expired', retry_deadline: new Date(now - 1).toISOString() });
    await expect(runDurableCheckout(input, null, quote, params, d)).rejects.toMatchObject({ code: 'checkout_attempt_busy' });
    expect(d.create).not.toHaveBeenCalled();
  });
});
