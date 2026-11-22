// Dedicated project; temporary private QA admin only. No commercial fixture persists.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { runBrowserChecks } from './verify-orders-admin-ui.mjs';
const { fetch, AbortSignal, URL } = globalThis;
if (process.env.BOREALE_ENV_FILE) process.loadEnvFile(process.env.BOREALE_ENV_FILE);
assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'luojeyfznonjnacftxbm.supabase.co');
process.env.NODE_ENV = 'test';
process.env.CHECKOUT_ENABLED = 'false';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.FRONTEND_URL = process.env.BOREALE_ADMIN_UI_URL || 'http://127.0.0.1:3103';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.EMAIL_API_KEY;
const { createApp } = await import('../dist/src/app.js');
const { db } = await import('../dist/src/lib/supabase.js');
const { hashPassword } = await import('../dist/src/lib/password.js');
const output = process.env.BOREALE_QA_OUTPUT || path.resolve('outputs/orders-admin');
await fs.mkdir(output, { recursive: true });
const report = { scope: 'Real private QA admin login, database and loopback API. Populated browser orders explicitly simulated.', realPaymentTested: false, checks: [], pageErrors: [] };
function check(name, condition) {
  report.checks.push({ name, passed: Boolean(condition) });
  if (report.checks.length % 5 === 0 || !condition) console.log(JSON.stringify({ checked: report.checks.length, latest: name, passed: Boolean(condition) }));
  assert.ok(condition, name);
}
const id = randomUUID(); const email = `qa-admin-${id}@example.invalid`; const password = randomBytes(32).toString('hex');
let server; let cookie;
async function request(route, { method = 'GET', body, authenticated = true } = {}) {
  const res = await fetch('http://127.0.0.1:4001' + route, { method, signal: AbortSignal.timeout(60000),
    headers: { ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, data: await res.json(), cookies: res.headers.getSetCookie() };
}
try {
  const inserted = await db().from('admin_users').insert({ id, email, password_hash: hashPassword(password), role: 'admin', is_active: true });
  assert.ifError(inserted.error);
  server = createApp().listen(4001, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  check('anonymous_orders_denied', (await request('/api/admin/orders', { authenticated: false })).status === 401);
  check('wrong_password_denied', (await request('/api/admin/auth/login', { method: 'POST', authenticated: false, body: { email, password: 'wrong-password-123' } })).status === 401);
  const login = await request('/api/admin/auth/login', { method: 'POST', authenticated: false, body: { email, password } });
  cookie = login.cookies.find(c => c.startsWith('boreale_admin='))?.split(';')[0];
  check('real_temporary_admin_login_sets_httponly_cookie', login.status === 200 && Boolean(cookie) && login.cookies.some(c => /HttpOnly/i.test(c)));
  check('real_admin_identity', (await request('/api/admin/auth/me')).data.data.id === id);
  const list = await request('/api/admin/orders');
  check('real_empty_orders_no_fabrication', list.status === 200 && list.data.total === 0 && list.data.data.length === 0);
  for (const q of ['%', '_', '*', '\\', 'x),email.neq.x', '"', '[]()^$.+?{}|']) {
    const result = await request('/api/admin/orders?q=' + encodeURIComponent(q));
    check('literal_search_parses_' + q, result.status === 200 && result.data.total === 0);
  }
  // Existing private draft products exercise the same PostgREST quoted IMATCH grammar
  // against nonempty real rows without creating synthetic orders.
  const drafts = await db().from('products').select('name'); assert.ifError(drafts.error);
  assert.ok(drafts.data.length > 0);
  for (const q of ['%', '_', '*', '\\', '"', '[]()^$.+?{}|', drafts.data[0].name]) {
    const pattern = q.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    const literal = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const result = await db().from('products').select('name').or('name.imatch."' + literal + '"');
    check('real_postgrest_literal_search_' + (q.length > 20 ? 'control' : q), !result.error && result.data.length === drafts.data.filter(row => row.name.toLowerCase().includes(q.toLowerCase())).length);
  }
  check('unknown_order_404', (await request('/api/admin/orders/' + randomUUID())).status === 404);
  const stats = await request('/api/admin/stats');
  check('real_zero_dashboard_and_operations', stats.status === 200 && stats.data.data.orders.total === 0 && Object.values(stats.data.data.operations).every(v => v === 0));
  const refund = await request('/api/admin/orders/' + randomUUID() + '/refund', { method: 'POST', body: { amountCents: 100 } });
  check('unsafe_refund_unavailable', refund.status === 503);
  check('anonymous_mutation_denied', (await request('/api/admin/orders/' + randomUUID() + '/notes', { method: 'POST', authenticated: false, body: { note: 'Must not persist' } })).status === 401);
  if (process.env.BOREALE_ADMIN_UI_URL) await runBrowserChecks({ report, check, output, cookie, email });
  const deactivated = await db().from('admin_users').update({ is_active: false }).eq('id', id).eq('email', email);
  assert.ifError(deactivated.error);
  check('deactivated_admin_session_revoked_immediately', (await request('/api/admin/orders')).status === 401);
} catch (error) { report.failure = error instanceof Error ? error.message : 'QA failure'; process.exitCode = 1; }
finally {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  const cleanup = await db().from('admin_users').delete().eq('id', id).eq('email', email);
  const remaining = await db().from('admin_users').select('id', { count: 'exact', head: true }).eq('id', id);
  const cleaned = !cleanup.error && !remaining.error && remaining.count === 0;
  report.checks.push({ name: 'temporary_admin_removed', passed: cleaned });
  if (!cleaned) { report.failure = 'Temporary QA administrator cleanup failed'; process.exitCode = 1; }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ completed: !report.failure, checks: report.checks.length, failures: report.checks.filter(c => !c.passed).length, output }));
  if (report.failure) console.error(report.failure);
}
