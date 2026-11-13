import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
import console from 'node:console';

const { fetch } = globalThis;

// Requires the local API running via npm start. Credentials stay in memory.
assert.equal(process.env.SUPABASE_URL, 'https://luojeyfznonjnacftxbm.supabase.co');
const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const run = randomUUID();
const email = `boreale-http-qa-${run}@example.invalid`;
const password = `${randomBytes(24).toString('base64url')}aA1!`;
const cookies = new Map();
let fixtureId;
let checks = 0;
let cleaned = false;
function check(condition, label) { assert.ok(condition, label); checks++; }
async function request(path, method = 'GET', body, extraHeaders = {}) {
  const response = await fetch(`http://127.0.0.1:4000${path}`, { method,
    headers: { 'Content-Type': 'application/json', Cookie: [...cookies].filter(([name]) => path.startsWith('/api/auth/') || name !== 'boreale_refresh').map(([name, value]) => `${name}=${value}`).join('; '), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const setCookies = response.headers.getSetCookie();
  for (const entry of setCookies) {
    const pair = entry.split(';')[0]; const separator = pair.indexOf('=');
    const name = pair.slice(0, separator); const value = pair.slice(separator + 1);
    if (value) cookies.set(name, value); else cookies.delete(name);
  }
  return { status: response.status, body: await response.json(), setCookies };
}
try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { first_name: 'HTTP QA', marketing_optin: false, boreale_qa_run: run } });
  check(!created.error && Boolean(created.data.user), 'create isolated test account');
  fixtureId = created.data.user.id;
  const login = await request('/api/auth/login', 'POST', { email, password });
  check(login.status === 200 && login.body.data?.id === fixtureId && login.body.data.firstName === 'HTTP QA', 'real API login and persisted profile');
  check(login.setCookies.length === 2 && login.setCookies.every((cookie) => cookie.includes('HttpOnly')), 'both Auth cookies httpOnly');
  const me = await request('/api/me');
  check(me.status === 200 && me.body.data?.id === fixtureId, 'authenticated API identity');
  const edited = await request('/api/me', 'PATCH', { firstName: 'HTTP updated', marketingOptin: true });
  check(edited.status === 200 && edited.body.data?.firstName === 'HTTP updated', 'user-scoped API profile update');
  const oldRefresh = cookies.get('boreale_refresh');
  const refreshed = await request('/api/auth/refresh', 'POST');
  check(refreshed.status === 200 && refreshed.body.data?.firstName === 'HTTP updated' && refreshed.body.data.marketingOptin === true, 'refresh reads persisted profile');
  check(Boolean(cookies.get('boreale_refresh')) && cookies.get('boreale_refresh') !== oldRefresh, 'refresh token rotation');
  const admin = await request('/api/admin/auth/me', 'GET', undefined, { Authorization: `Bearer ${cookies.get('boreale_token')}` });
  check(admin.status === 401, 'customer token cannot authenticate as administrator');
  const checkout = await request('/api/stripe/checkout', 'POST', { items: [{ variantId: randomUUID(), quantity: 1 }], shippingMethod: 'standard',
    customer: { email, firstName: 'QA', lastName: 'Test', address: { line1: 'Adresse test fictive', postalCode: '75001', city: 'Paris', country: 'FR' } } });
  check(checkout.status === 503 && checkout.body.error?.code === 'checkout_closed', 'sales remain closed');
  const logout = await request('/api/auth/logout', 'POST');
  check(logout.status === 200 && logout.body.remoteRevoked === true, 'remote logout confirmed');
  const anonymous = await request('/api/me');
  check(anonymous.status === 401, 'API denies identity after logout');
} finally {
  if (fixtureId) {
    const existing = await service.auth.admin.getUserById(fixtureId);
    assert.ok(!existing.error && existing.data.user?.email === email && existing.data.user.user_metadata?.boreale_qa_run === run, 'cleanup must target only this test account');
    const removed = await service.auth.admin.deleteUser(fixtureId);
    assert.ok(!removed.error, 'test account cleanup'); cleaned = true;
  }
  console.log(JSON.stringify({ checksPassed: checks, temporaryUserRemoved: cleaned }));
}
