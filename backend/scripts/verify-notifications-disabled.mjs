// Actual loopback HTTP smoke, with every external request forbidden. No database/provider credentials loaded.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
const { fetch: localFetch, URL } = globalThis;
process.env.NODE_ENV = 'test';
process.env.AUTH_PROVIDER = 'legacy';
process.env.CHECKOUT_ENABLED = 'false';
process.env.ORDER_EMAIL_MODE = 'off';
process.env.EMAIL_API_KEY = 'unit-fixture-never-sent';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CRON_SECRET = randomBytes(48).toString('hex');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
let externalRequests = 0;
globalThis.fetch = async (input, options) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  if (new URL(url).hostname !== '127.0.0.1') { externalRequests++; throw new Error('External request forbidden during disabled smoke'); }
  return localFetch(input, options);
};
const { createApp } = await import('../dist/src/app.js');
const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = 'http://127.0.0.1:' + server.address().port;
try {
  for (const auth of [undefined, 'Bearer invalid']) {
    const response = await localFetch(base + '/api/cron/order-notifications', { method: 'POST', headers: auth ? { Authorization: auth } : {} });
    assert.equal(response.status, 401);
  }
  const response = await localFetch(base + '/api/cron/order-notifications', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET } });
  assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'order_emails_disabled');
  assert.equal((await localFetch(base + '/api/cron/order-notifications')).status, 404);
  assert.equal(externalRequests, 0);
  console.log(JSON.stringify({ checks: 5, passed: 5, externalRequests, databaseTested: false, emailProviderTested: false, mode: 'off' }));
} finally { await new Promise(resolve => server.close(resolve)); globalThis.fetch = localFetch; }
