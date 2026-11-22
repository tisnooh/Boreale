import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmationBody, runOrderConfirmations, sendConfirmationToProvider, type ConfirmationDeps, type ConfirmationSettings } from '../src/services/order-notifications.js';
import type { OrderDTO } from '../src/types/index.js';
vi.mock('../src/config.js', () => ({ config: () => ({ EMAIL_API_KEY: 'unit-test-provider-key' }), features: { email: () => true } }));
const order = {
  id: 'order-fixture', number: 'BOR-TEST', email: 'buyer@example.test', status: 'paid', fulfillmentStatus: 'ready',
  currency: 'EUR', totalCents: 4200, paidAt: '2026-11-16T00:00:00Z',
  items: [{ productName: '<script>alert(1)</script>', variantTitle: 'A & B', quantity: 2 }],
} as OrderDTO;
const options: ConfirmationSettings = { mode: 'test', configured: true, from: 'BORÉALE <orders@example.test>', testRecipients: ['buyer@example.test'] };
const job = { id: 'notification-1', order_id: order.id, delivery_token: 'private-lease-token' };
function deps(): ConfirmationDeps {
  return { claim: vi.fn().mockResolvedValue([job]), load: vi.fn().mockResolvedValue({ order, amountCents: 4200, currency: 'EUR' }),
    freeze: vi.fn(async (_job, body) => body), finish: vi.fn().mockResolvedValue(true), send: vi.fn().mockResolvedValue('provider-id') };
}
afterEach(() => vi.unstubAllGlobals());
describe('durable confirmation runner (no real provider or database)', () => {
  it.each([{ mode: 'off' }, { configured: false }])('refuses disabled or unconfigured before claim %#', async override => {
    const d = deps(); await expect(runOrderConfirmations(d, { ...options, ...override } as ConfirmationSettings)).rejects.toMatchObject({ status: 503 });
    expect(d.claim).not.toHaveBeenCalled(); expect(d.send).not.toHaveBeenCalled();
  });
  it.each([{ testRecipients: [] }, { testRecipients: ['*'] }, { testRecipients: ['bad-address'] }])('requires exact test recipients %#', async ({ testRecipients }) => {
    const d = deps(); await expect(runOrderConfirmations(d, { ...options, testRecipients })).rejects.toMatchObject({ status: 503 });
    expect(d.claim).not.toHaveBeenCalled();
  });
  it('does not consume jobs when sender configuration is invalid', async () => {
    const d = deps(); await expect(runOrderConfirmations(d, { ...options, from: 'BORÉALE <bonjour@localhost>' })).rejects.toMatchObject({ code: 'email_sender_required' });
    expect(d.claim).not.toHaveBeenCalled();
  });
  it('freezes escaped historical content before provider call, records acceptance only', async () => {
    const d = deps(); expect(await runOrderConfirmations(d, options)).toEqual({ claimed: 1, accepted: 1, failed: 0 });
    expect(d.claim).toHaveBeenCalledWith(2, ['buyer@example.test']);
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('&lt;script&gt;') }), 'boreale-confirmation/notification-1');
    expect(vi.mocked(d.send).mock.calls[0]![0].html).not.toContain('<script>');
    expect(d.finish).toHaveBeenCalledWith(job, 'provider-id', null);
  });
  it('blocked stock confirmation does not promise preparation or delivery', () => {
    const body = confirmationBody({ ...order, fulfillmentStatus: 'blocked' }, options.from);
    expect(body.html).toContain('nécessite une vérification'); expect(body.html).toContain('Aucun délai d’expédition');
  });
  it.each([null, { order: { ...order, paidAt: null }, amountCents: 4200, currency: 'EUR' }, { order, amountCents: 4100, currency: 'EUR' }, { order, amountCents: 4200, currency: 'USD' }])('does not send without matching durable paid evidence %#', async paid => {
    const d = deps(); vi.mocked(d.load).mockResolvedValue(paid);
    await runOrderConfirmations(d, options); expect(d.send).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenCalledWith(job, null, 'order_unverified');
  });
  it.each(['pending', 'cancelled', 'refunded', 'partially_refunded'] as const)('does not send stale purchase confirmation in state %s', async status => {
    const d = deps(); vi.mocked(d.load).mockResolvedValue({ order: { ...order, status }, amountCents: 4200, currency: 'EUR' });
    await runOrderConfirmations(d, options); expect(d.send).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenCalledWith(job, null, 'order_unverified');
  });
  it('cannot send to an unapproved test recipient or poisoned frozen body', async () => {
    const d = deps(); await runOrderConfirmations(d, { ...options, testRecipients: ['other@example.test'] });
    expect(d.send).not.toHaveBeenCalled(); expect(d.finish).toHaveBeenCalledWith(job, null, 'recipient_not_allowed');
    vi.mocked(d.freeze).mockResolvedValue({ ...confirmationBody(order, options.from), to: 'other@example.test' });
    await runOrderConfirmations(d, options); expect(d.send).not.toHaveBeenCalled();
    expect(d.finish).toHaveBeenLastCalledWith(job, null, 'payload_invalid');
  });
  it('reuses exact frozen body/key after ambiguous provider timeout even if sender setting changed', async () => {
    const d = deps(); const frozen = confirmationBody(order, options.from);
    vi.mocked(d.freeze).mockResolvedValue(frozen); vi.mocked(d.send).mockRejectedValueOnce(new Error('private provider diagnostic')).mockResolvedValueOnce('provider-id');
    await runOrderConfirmations(d, options);
    await runOrderConfirmations(d, { ...options, from: 'New sender <new@example.test>' });
    expect(vi.mocked(d.send).mock.calls[0]).toEqual(vi.mocked(d.send).mock.calls[1]);
    expect(d.finish).toHaveBeenNthCalledWith(1, job, null, 'provider_unavailable');
  });
  it('does not claim successful persistence after lease lost or ack storage failure', async () => {
    const d = deps(); vi.mocked(d.finish).mockResolvedValue(false);
    await expect(runOrderConfirmations(d, options)).rejects.toMatchObject({ code: 'notification_lease_lost' });
    expect(d.send).toHaveBeenCalledTimes(1);
    vi.mocked(d.finish).mockRejectedValue(new Error('Database unavailable'));
    await expect(runOrderConfirmations(d, options)).rejects.toThrow('Database unavailable');
  });
});
describe('provider adapter (fetch mocked; no external email)', () => {
  it('sends bounded request with stable Idempotency-Key and requires provider id', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'provider-id' }) }); vi.stubGlobal('fetch', request);
    expect(await sendConfirmationToProvider(confirmationBody(order, options.from), 'stable-key')).toBe('provider-id');
    expect(request).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': 'stable-key' }), signal: expect.any(AbortSignal) }));
    request.mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(sendConfirmationToProvider(confirmationBody(order, options.from), 'stable-key')).rejects.toMatchObject({ code: 'email_provider_unconfirmed' });
  });
  it('treats provider non-2xx as unavailable without returning its private diagnostic', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(sendConfirmationToProvider(confirmationBody(order, options.from), 'stable-key')).rejects.toMatchObject({ code: 'email_provider_unavailable' });
  });
});
