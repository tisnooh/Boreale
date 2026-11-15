// Loopback integration QA. Requires the existing dedicated project in secure env.
// No real admin login, payment, email, sale, stock or new product fixture is created.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
const { fetch, AbortSignal } = globalThis;

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
const { signAdminToken, signUserToken } = await import('../dist/src/lib/jwt.js');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const registry = JSON.parse(await fs.readFile(path.join(repoRoot, 'sourcing/alibaba-candidates.json'), 'utf8'));
const output = process.env.BOREALE_QA_OUTPUT || path.join(repoRoot, 'outputs/sourcing');
await fs.mkdir(output, { recursive: true });
const report = { scope: 'real database and local API; optional local UI', authFixture: 'ephemeral signed admin token, not owner login', realPaymentTested: false, checks: [], pageErrors: [] };
function check(name, condition) {
  report.checks.push({ name, passed: Boolean(condition) });
  if (!condition) throw new Error(`QA failed: ${name}`);
}
const admin = signAdminToken({ sub: '00000000-0000-4000-8000-000000000099', email: 'qa-sourcing@example.invalid', role: 'admin' });
const customerKind = signUserToken({ sub: '00000000-0000-4000-8000-000000000098', email: 'qa-sourcing@example.invalid' });
const server = createApp().listen(4001, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = 'http://127.0.0.1:4001';
async function request(route, { method = 'GET', body, token = admin } = {}) {
  const response = await fetch(base + route, { method, signal: AbortSignal.timeout(60000),
    headers: { ...(token ? { Cookie: `boreale_admin=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
let browser;
try {
  check('anonymous_admin_api_denied', (await request('/api/admin/sourcing-candidates', { token: null })).status === 401);
  check('user_kind_cannot_be_admin', (await request('/api/admin/sourcing-candidates', { token: customerKind })).status === 401);
  const list = await request('/api/admin/sourcing-candidates');
  check('admin_reads_three_candidates', list.status === 200 && list.data.data.length === 3);
  for (const payload of registry.candidates) {
    const key = payload.candidateKey;
    const detail = await request('/api/admin/sourcing-candidates/' + key);
    const row = detail.data.data;
    check(`${key}_linked_private_draft`, detail.status === 200 && row.product_id === row.products.id && row.products.is_active === false && row.products.procurement_status === 'unverified');
    check(`${key}_source_preserved`, row.source_url === payload.sourceUrl && row.source_product_id === payload.sourceProductId && row.observed_at === payload.observedAt);
    const repeated = await Promise.all(Array.from({ length: 6 }, () => request('/api/admin/sourcing-candidates', { method: 'POST', body: payload })));
    check(`${key}_concurrent_import_is_idempotent`, repeated.every(r => r.status === 200 && r.data.data.created === false && r.data.data.product.id === row.product_id));
    const unchanged = await request('/api/admin/sourcing-candidates/' + key, { method: 'PUT', body: payload });
    check(`${key}_metadata_save_works`, unchanged.status === 200 && unchanged.data.data.created === false);
    const forged = await request('/api/admin/sourcing-candidates', { method: 'POST', body: { ...payload, isActive: true, stock: 9 } });
    check(`${key}_forged_fields_rejected`, forged.status >= 400 && forged.status < 500);
    const activate = await request('/api/admin/products/' + row.product_id, { method: 'PUT', body: {
      slug: row.products.slug, name: row.title, description: 'QA request must be refused without writes', isActive: true,
      variants: [{ sku: 'QA-NOT-CREATED', title: 'QA request only', priceCents: 100, stock: 9, isActive: true }],
    } });
    check(`${key}_generic_activation_rejected_before_writes`, activate.status === 409 && activate.data.error.code === 'sourced_draft_readonly');
    check(`${key}_public_detail_hidden`, (await request('/api/products/' + row.products.slug, { token: null })).status === 404);
  }
  const catalogue = await request('/api/products', { token: null });
  check('public_catalogue_has_no_unverified_product', catalogue.status === 200 && catalogue.data.data.length === 0);
  const closed = await request('/api/stripe/checkout', { method: 'POST', token: null, body: {
    items: [{ variantId: '00000000-0000-4000-8000-000000000099', quantity: 1 }], shippingMethod: 'standard',
    customer: { email: 'qa-sourcing@example.invalid', firstName: 'QA', lastName: 'Fixture', address: { line1: 'QA fixture only', postalCode: '75001', city: 'Paris', country: 'FR' } },
  } });
  check('checkout_remains_closed', closed.status === 503 && closed.data.error.code === 'checkout_closed');
  if (process.env.BOREALE_ADMIN_UI_URL) {
    const ui = process.env.BOREALE_ADMIN_UI_URL;
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(ui).hostname));
    const require = createRequire(import.meta.url);
    const { chromium } = require(process.env.BOREALE_PLAYWRIGHT_MODULE || 'playwright-core');
    browser = await chromium.launch({ headless: true });
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', locale: 'fr-FR' });
      await context.addCookies([{ name: 'boreale_admin', value: admin, domain: new URL(ui).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      page.setDefaultTimeout(120000);
      page.setDefaultNavigationTimeout(120000);
      page.on('pageerror', error => report.pageErrors.push(error.message));
      await page.goto(ui + '/admin/sourcing', { waitUntil: 'commit' });
      await page.getByRole('heading', { level: 1, name: 'Sourcing fournisseur', exact: true }).waitFor();
      await page.locator(`a[href="/admin/sourcing/${registry.candidates[0].candidateKey}"]`).waitFor();
      check(`ui_${width}_three_real_rows`, await page.locator('tbody tr').count() === 3);
      check(`ui_${width}_no_root_overflow`, await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth));
      await page.screenshot({ path: path.join(output, `admin-sourcing-${width}.jpg`), type: 'jpeg', quality: 80 });
      const payload = registry.candidates[2];
      await page.locator(`a[href="/admin/sourcing/${payload.candidateKey}"]`).click();
      await page.getByRole('heading', { level: 1, name: payload.candidateKey, exact: true }).waitFor();
      check(`ui_${width}_british_source_loaded`, await page.getByLabel('URL source Alibaba').inputValue() === payload.sourceUrl);
      await page.getByRole('button', { name: 'Enregistrer les métadonnées', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Métadonnées enregistrées' }).waitFor();
      check(`ui_${width}_real_metadata_save`, true);
      check(`ui_${width}_form_fits`, await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth));
      await page.screenshot({ path: path.join(output, `admin-source-detail-${width}.jpg`), type: 'jpeg', quality: 80 });
      await page.goto(ui + '/admin/produits', { waitUntil: 'commit' });
      await page.getByText(registry.candidates[0].candidateKey, { exact: true }).first().waitFor();
      check(`ui_${width}_unknown_price_not_zero`, await page.getByText('Non renseigné', { exact: true }).count() === 3);
      const first = list.data.data.find(r => r.candidate_key === registry.candidates[0].candidateKey);
      await page.goto(ui + '/admin/produits/' + first.product_id, { waitUntil: 'commit' });
      await page.locator(`a[href="/admin/sourcing/${first.candidate_key}"]`).first().waitFor();
      check(`ui_${width}_generic_editor_readonly`, await page.getByRole('button', { name: /Enregistrer/i }).count() === 0);
      await context.close();
    }
    const anonymous = await browser.newPage();
    await anonymous.goto(ui + '/admin/sourcing', { waitUntil: 'commit', timeout: 120000 });
    await anonymous.waitForURL('**/admin/login', { timeout: 120000 });
    check('anonymous_ui_redirected', true);
    await anonymous.close();
    check('ui_has_no_runtime_exception', report.pageErrors.length === 0);
  }
} catch (error) {
  report.failure = error instanceof Error ? error.message : 'QA failure';
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(output, process.env.BOREALE_ADMIN_UI_URL ? 'live-ui-results.json' : 'live-api-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, failures: report.checks.filter(c => !c.passed).length, completed: !report.failure, output }));
  if (report.failure) console.error(report.failure);
}
