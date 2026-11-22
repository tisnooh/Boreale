import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyEmailReadiness } from './verify-email-readiness.mjs';

const env = { EMAIL_FROM: 'BORÉALE <orders@example.com>', ORDER_EMAIL_MODE: 'test', ORDER_EMAIL_TEST_RECIPIENTS: 'qa@example.com' };
test('missing key never calls provider', async () => {
  let calls = 0;
  const r = await verifyEmailReadiness(env, () => { calls++; });
  assert.equal(r.reason, 'email_key_missing'); assert.equal(calls, 0);
});
test('test mode requires an explicit authorized recipient', async () => {
  const r = await verifyEmailReadiness({ ...env, ORDER_EMAIL_TEST_RECIPIENTS: '' }, () => { throw Error('must not call'); });
  assert.equal(r.reason, 'authorized_test_recipient_required');
});
test('invalid sender and header injection never access provider', async () => {
  for (const sender of ['bonjour@localhost', 'bad', 'orders@example.com\r\nBcc:x@example.com']) {
    assert.equal((await verifyEmailReadiness({ ...env, EMAIL_FROM: sender })).reason, 'sender_domain_required');
  }
});
test('provider exception cannot leak secret or internal diagnostics', async () => {
  const secret = 'private-test-placeholder';
  const r = await verifyEmailReadiness({ ...env, EMAIL_API_KEY: secret }, async () => { throw Error(secret); });
  assert.equal(r.reason, 'domain_read_unavailable'); assert.equal(JSON.stringify(r).includes(secret), false);
});
function provider({ status = 'verified', recordStatus = 'verified', enabled = 'enabled' } = {}) {
  const calls = [];
  return { calls, fetcher: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.includes('/domains?')
      ? { data: [{ id: 'domain-id', name: 'example.com', status, capabilities: { sending: enabled } }], has_more: false }
      : { name: 'example.com', status, records: [{ status: recordStatus }] } };
  } };
}
test('domain verification remains distinct from actual email delivery and changes no mode', async () => {
  const p = provider();
  const r = await verifyEmailReadiness({ ...env, ORDER_EMAIL_MODE: 'off', EMAIL_API_KEY: 'placeholder' }, p.fetcher);
  assert.equal(r.status, 'DOMAIN_VERIFIED'); assert.equal(r.domainVerified, true);
  assert.equal(r.deliveryVerified, false); assert.equal(r.mode, 'off'); assert.equal(r.emailsSent, 0);
  assert.equal(r.sendsEnabledByThisTool, false);
  assert.equal(p.calls.length, 2); assert.ok(p.calls.every(c => c.options.method === 'GET' && !c.url.includes('/emails')));
});
test('pending DNS, disabled sending and unverified domains remain blocked', async () => {
  for (const config of [{ recordStatus: 'pending' }, { status: 'pending' }, { enabled: 'disabled' }]) {
    const p = provider(config);
    const r = await verifyEmailReadiness({ ...env, EMAIL_API_KEY: 'placeholder' }, p.fetcher);
    assert.equal(r.status, 'BLOCKED'); assert.equal(r.domainVerified, false);
  }
});
test('permission failures are unverified and sanitized', async () => {
  const r = await verifyEmailReadiness({ ...env, EMAIL_API_KEY: 'placeholder' }, async () => ({ ok: false }));
  assert.equal(r.reason, 'domain_read_unavailable'); assert.equal(r.domainVerified, false);
});
test('pagination and malformed provider acknowledgements never falsely prove a domain missing or verified', async () => {
  for (const [body, expected] of [[{ data: [], has_more: true }, 'domain_search_incomplete'], [{ data: [] }, 'sender_domain_not_found'], [{ message: 'bad' }, 'domain_read_unconfirmed']]) {
    const r = await verifyEmailReadiness({ ...env, EMAIL_API_KEY: 'placeholder' }, async () => ({ ok: true, json: async () => body }));
    assert.equal(r.reason, expected); assert.equal(r.domainVerified, false);
  }
});
