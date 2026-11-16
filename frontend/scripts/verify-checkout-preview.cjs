/* Local Chromium UI checks. API states are explicitly simulated; never a payment test. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.BOREALE_PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BOREALE_AUDIT_URL || 'http://127.0.0.1:3105';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Loopback only');
const output = process.env.BOREALE_AUDIT_OUTPUT;
assert.ok(output, 'Set BOREALE_AUDIT_OUTPUT to a local evidence directory');
const result = { simulatedApi: true, previewMode: true, realPaymentTested: false, physicalDevices: false,
  checks: [], pageErrors: [], commercialRequests: [], externalRequests: [] };
function check(name, passed, detail) { result.checks.push({ name, passed: Boolean(passed), detail }); }
async function requireDom(page, stage) {
  result.stage = 'dom_' + stage;
  let timer;
  try {
    const dom = await Promise.race([
      page.evaluate(() => Boolean(document.body)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Browser DOM unavailable; business assertions not reached')), 15000); }),
    ]);
    assert.ok(dom, 'Browser DOM unavailable; business assertions not reached');
  } finally { clearTimeout(timer); }
  result.stage = 'business_' + stage;
}
async function fits(page, name) {
  const box = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  check(name + '_fits', box.content <= box.width, box);
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      let state = 'unrecorded';
      await context.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
          result.externalRequests.push(url.origin); return route.abort();
        }
        if (!url.pathname.startsWith('/api/')) return route.continue();
        const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (request.method() !== 'GET' && !url.pathname.startsWith('/api/auth/')) result.commercialRequests.push(url.pathname);
        if (url.pathname.startsWith('/api/stripe/session/')) {
          if (state === 'failed') return route.fulfill({ status: 503, headers, json: { error: { code: 'qa_simulated_failure', message: 'QA' } } });
          return route.fulfill({ headers, json: { data: { paymentStatus: 'paid', amountTotal: 100, customerEmail: 'qa@example.invalid',
            orderNumber: 'QA-SIMULATED-ONLY', paidOrderRecorded: state === 'recorded', fulfillmentStatus: 'blocked' } } });
        }
        return route.fulfill({ status: 401, headers, json: { error: { code: 'qa_no_session', message: 'Isolated preview' } } });
      });
      await context.addInitScript(() => localStorage.setItem('boreale_cart_v1', JSON.stringify([{
        variantId: '00000000-0000-4000-a000-202611169999', productSlug: 'qa-preview', name: 'QA local uniquement',
        variantTitle: 'QA', priceCents: 100, quantity: 1, imageUrl: null, maxQuantity: 1,
      }])));
      const page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(error.message));
      page.setDefaultTimeout(60000);
      await page.goto(base + '/checkout', { waitUntil: 'commit', timeout: 60000 });
      await requireDom(page, 'checkout_' + width);
      await page.locator('main form').waitFor({ timeout: 120000 });
      await fits(page, 'checkout_' + width);
      for (const [id, value] of Object.entries({ email: 'qa@example.invalid', firstName: 'QA', lastName: 'Only', line1: '12 rue QA', postalCode: '75001', city: 'Paris' })) {
        await page.locator('#' + id).fill(value);
      }
      await page.locator('main input[type=checkbox]').check();
      await page.getByRole('button', { name: /^Payer/ }).click();
      await page.locator('main [role=status]').waitFor();
      check('preview_notice_' + width, /preview/i.test(await page.locator('main [role=status]').innerText()));
      check('preview_no_attempt_storage_' + width, await page.evaluate(() => sessionStorage.getItem('boreale.checkout-attempt.v1') === null));
      await page.screenshot({ path: path.join(output, 'checkout-' + width + '.png'), fullPage: true, animations: 'disabled' });
      await page.goto(base + '/checkout/success?session_id=cs_test_QASimulated', { waitUntil: 'commit', timeout: 60000 });
      await requireDom(page, 'pending_' + width);
      await page.getByRole('heading', { name: 'Paiement reçu, confirmation de commande en cours' }).waitFor();
      check('paid_without_recording_pending_' + width, true);
      check('no_false_email_claim_' + width, !/vient de partir|préparons votre colis/.test(await page.locator('main').innerText()));
      await fits(page, 'pending_' + width);
      state = 'recorded'; await page.reload({ waitUntil: 'commit', timeout: 60000 });
      await requireDom(page, 'recorded_' + width);
      await page.getByRole('heading', { name: 'Merci, votre commande est enregistrée !' }).waitFor();
      check('recorded_blocked_notice_' + width, (await page.locator('main').innerText()).includes('Aucun délai d’expédition n’est confirmé'));
      await fits(page, 'recorded_' + width);
      await page.screenshot({ path: path.join(output, 'recorded-blocked-' + width + '.png'), fullPage: true, animations: 'disabled' });
      state = 'failed'; await page.reload({ waitUntil: 'commit', timeout: 60000 });
      await requireDom(page, 'failure_' + width);
      await page.getByRole('heading', { name: 'Page de confirmation', exact: true }).waitFor();
      check('failure_no_recording_promise_' + width, !/votre commande est enregistrée|recevrez un email/.test(await page.locator('main').innerText()));
      await fits(page, 'failure_' + width);
      await context.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { result.failure = error.message; }).finally(async () => {
  check('no_js_exception', result.pageErrors.length === 0, result.pageErrors);
  check('no_commercial_api_call', result.commercialRequests.length === 0, result.commercialRequests);
  check('no_external_request', result.externalRequests.length === 0, result.externalRequests);
  result.passed = result.checks.filter(item => item.passed).length;
  const failedChecks = result.checks.filter(item => !item.passed).length;
  result.failed = failedChecks + (result.failure ? 1 : 0);
  result.verdict = failedChecks ? 'FAILED' : result.failure ? (result.stage?.startsWith('dom_') ? 'BLOCKED' : 'FAILED') : 'PASS';
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ checks: result.checks.length, passed: result.passed, failed: result.failed, simulatedApi: true, failure: result.failure }));
  if (result.failed) process.exitCode = 1;
});
