// Real login/empty database UI, then explicitly simulated order scenarios. No order POST reaches the API.
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
const { URL } = globalThis;
export async function runBrowserChecks({ report, check, output, cookie, email }) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.BOREALE_PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true });
  const ui = process.env.BOREALE_ADMIN_UI_URL;
  async function capture(page, name) {
    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, name + '.jpg'), fullPage: true, type: 'jpeg', quality: 80 });
  }
  try {
    for (const width of [320, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'fr-FR' });
      await context.addCookies([{ name: 'boreale_admin', value: cookie.slice(cookie.indexOf('=') + 1), domain: '127.0.0.1', path: '/', httpOnly: true }]);
      const page = await context.newPage(); page.setDefaultTimeout(120000);
      page.on('pageerror', error => report.pageErrors.push(error.message));
      const fits = () => page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth);
      await page.goto(ui + '/admin', { waitUntil: 'commit' });
      await page.getByRole('heading', { name: 'Opérations à suivre', exact: true }).waitFor();
      check(`real_dashboard_${width}_fits`, await fits());
      await page.goto(ui + '/admin/commandes', { waitUntil: 'commit' });
      await page.getByText('Aucune commande ne correspond.', { exact: true }).waitFor();
      check(`real_empty_orders_${width}_fits`, await fits());
      const input = page.getByRole('textbox', { name: 'Rechercher', exact: true });
      const button = page.getByRole('button', { name: 'Rechercher', exact: true });
      const inputBox = await input.boundingBox(); const buttonBox = await button.boundingBox();
      check(`real_search_controls_${width}_visible`, Boolean(inputBox && buttonBox && inputBox.width >= 100 && buttonBox.width >= 80));
      await input.fill('QA-recherche');
      const searched = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/orders' && new URL(response.url()).searchParams.get('q') === 'QA-recherche');
      await button.click();
      check(`real_search_button_${width}_works`, (await searched).status() === 200);
      await page.getByText('Aucune commande ne correspond.', { exact: true }).waitFor();
      await input.fill('');
      const reset = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/orders' && !new URL(response.url()).searchParams.has('q'));
      await button.click(); await reset;
      await page.getByText('Aucune commande ne correspond.', { exact: true }).waitFor();
      await capture(page, `orders-empty-${width}`);
      let listFails = true;
      await page.route('**/api/admin/orders?**', async route => {
        if (listFails) await route.fulfill({ status: 503, json: { error: { code: 'qa_simulation', message: 'Erreur simulée de chargement' } } });
        else await route.continue();
      });
      await page.reload({ waitUntil: 'commit' });
      await page.getByRole('alert').filter({ hasText: 'Erreur simulée' }).waitFor();
      check(`simulated_list_failure_${width}_honest`, await page.getByText('Aucune commande ne correspond.', { exact: true }).count() === 0);
      listFails = false; await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await page.getByText('Aucune commande ne correspond.', { exact: true }).waitFor();
      check(`real_list_retry_${width}_works`, true);
      const fixture = {
        id: '00000000-0000-4000-8000-000000000771', number: 'QA-SIMULATION-' + 'LONG'.repeat(22),
        email: 'qa-' + 'client'.repeat(16) + '@example.invalid', status: 'paid', fulfillmentStatus: 'ready', currency: 'EUR',
        subtotalCents: 4200, discountCents: 0, shippingCents: 0, totalCents: 4200, shippingMethod: 'standard', discountCode: null,
        shippingAddress: { firstName: 'Client', lastName: 'SIMULATION', line1: 'Adresse de recette', line2: null, postalCode: '75001', city: 'Paris', country: 'FR', phone: null },
        items: [{ sku: 'QA-ARTICLE', productName: 'SIMULATION-' + 'Article'.repeat(25), variantTitle: 'Variante de recette', unitPriceCents: 2100, quantity: 2, totalCents: 4200, imageUrl: null }],
        tracking: { carrier: null, number: null, url: null }, placedAt: '2026-11-15T12:00:00Z', paidAt: '2026-11-15T12:01:00Z', shippedAt: null, deliveredAt: null, cancelledAt: null,
        events: [], incidents: [], notifications: [{ id: 'qa-notification', type: 'confirmation', status: 'pending', attempts: 0, last_error: null, sent_at: null }],
        payment: { status: 'succeeded', stripe_payment_intent_id: 'SIMULATED-NOT-A-PAYMENT', amount_cents: 4200, refunded_cents: 0 },
      };
      await page.unroute('**/api/admin/orders?**');
      await page.route('**/api/admin/orders?**', route => route.fulfill({ json: { data: [fixture], total: 1, page: 1, limit: 25 } }));
      await page.reload({ waitUntil: 'commit' });
      await page.getByRole('link', { name: fixture.number, exact: true }).waitFor();
      check(`simulated_populated_list_${width}_fits`, await fits());
      await capture(page, `orders-list-${width}`);
      const capabilities = () => ({
        allowedStatuses: fixture.fulfillmentStatus === 'blocked' ? [] : ({ paid: ['processing', 'shipped'], processing: ['shipped'], shipped: ['delivered'] }[fixture.status] || []),
        canEditTracking: fixture.fulfillmentStatus === 'ready' && ['shipped', 'delivered'].includes(fixture.status), canAddNote: true,
        refund: { enabled: false, reason: 'Remboursements désactivés : intégration non validée.' },
        notifications: { enabled: false, reason: 'Envoi des notifications non opérationnel.' },
      });
      let failNote = true; let posted = 0;
      await page.route('**/api/admin/orders/' + fixture.id + '**', async route => {
        const request = route.request(); const action = new URL(request.url()).pathname.split('/')[5];
        if (request.method() === 'GET') return route.fulfill({ json: { data: { ...fixture, capabilities: capabilities() } } });
        const body = request.postDataJSON(); posted++;
        if (action === 'notes') {
          if (failNote) { failNote = false; return route.fulfill({ status: 503, json: { error: { message: 'Échec simulé, note conservée' } } }); }
          fixture.events.push({ id: posted, type: 'admin_note', data: { note: body.note, by: email }, created_at: new Date().toISOString() });
        } else if (action === 'status') {
          if (body.expectedStatus !== fixture.status || !capabilities().allowedStatuses.includes(body.status) || body.notify !== false) throw new Error('Invalid simulated status request');
          if (body.status === 'shipped') fixture.tracking = { carrier: body.trackingCarrier, number: body.trackingNumber, url: body.trackingUrl };
          fixture.events.push({ id: posted, type: 'status_' + body.status, data: { from: fixture.status, to: body.status, by: email }, created_at: new Date().toISOString() });
          fixture.status = body.status;
        } else if (action === 'tracking') {
          if (body.expectedStatus !== fixture.status || JSON.stringify(body.expectedTracking) !== JSON.stringify(fixture.tracking)) throw new Error('Invalid simulated tracking request');
          fixture.tracking = { carrier: body.trackingCarrier, number: body.trackingNumber, url: body.trackingUrl };
        } else throw new Error('Unexpected simulated mutation');
        await route.fulfill({ json: { data: { ...fixture, capabilities: capabilities() } } });
      });
      await page.goto(ui + '/admin/commandes/' + fixture.id, { waitUntil: 'commit' });
      await page.getByRole('heading', { name: fixture.number, exact: true }).waitFor();
      check(`simulated_detail_${width}_long_fields_fit`, await fits());
      check(`simulated_detail_${width}_financial_statuses_absent`, (await page.locator('#status option').allTextContents()).join('|') === 'En préparation|Expédiée');
      await page.getByLabel('Ajouter une note', { exact: true }).fill('Note QA simulée');
      await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Échec simulé' }).waitFor();
      check(`simulated_note_failure_${width}_preserves_text`, await page.getByLabel('Ajouter une note', { exact: true }).inputValue() === 'Note QA simulée');
      await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
      await page.getByText('Note : Note QA simulée', { exact: true }).waitFor();
      check(`simulated_note_${width}_history`, true);
      await page.getByRole('button', { name: 'Enregistrer le statut', exact: true }).click();
      await page.locator('#status option[value="processing"]').waitFor({ state: 'detached' });
      await page.locator('#status option[value="shipped"]').waitFor({ state: 'attached' });
      check(`simulated_preparation_${width}_works`, fixture.status === 'processing');
      await page.getByLabel('Transporteur', { exact: true }).fill('Transport QA');
      await page.getByLabel('N° de suivi', { exact: true }).fill('QA-T1');
      await page.getByLabel('URL de suivi (https:// ou http://)', { exact: true }).fill('https://example.invalid/QA-T1');
      await page.getByRole('button', { name: 'Enregistrer le statut', exact: true }).click();
      await page.getByRole('button', { name: 'Enregistrer le suivi', exact: true }).waitFor();
      check(`simulated_shipping_${width}_tracking`, fixture.status === 'shipped' && fixture.tracking.number === 'QA-T1');
      await page.getByLabel('N° de suivi', { exact: true }).fill('QA-T2');
      await page.getByLabel('N° de suivi', { exact: true }).press('Enter');
      await page.getByRole('status').filter({ hasText: 'Suivi enregistré' }).waitFor();
      await page.getByRole('button', { name: 'Enregistrer le suivi', exact: true }).waitFor();
      check(`simulated_tracking_enter_${width}_does_not_deliver`, fixture.status === 'shipped' && fixture.tracking.number === 'QA-T2');
      await page.getByRole('button', { name: 'Enregistrer le statut', exact: true }).click();
      await page.getByText('Aucun changement de statut autorisé pour cette commande.', { exact: true }).waitFor();
      check(`simulated_delivery_${width}_works`, fixture.status === 'delivered');
      await capture(page, `orders-detail-${width}`);
      fixture.fulfillmentStatus = 'blocked'; fixture.status = 'paid';
      fixture.incidents.push({ id: 'qa-incident', code: 'QA_STOCK_BLOCKED', status: 'open', owner_role: 'operations', next_action: 'SIMULATION-' + 'Verifier'.repeat(25), created_at: fixture.placedAt });
      await page.reload({ waitUntil: 'commit' });
      await page.getByText('Responsable : operations', { exact: true }).waitFor();
      check(`simulated_blocked_${width}_cannot_advance`, await page.getByRole('button', { name: 'Enregistrer le statut', exact: true }).count() === 0 && await fits());
      await page.goto(ui + '/', { waitUntil: 'commit' });
      await page.getByText('boutique en préparation.', { exact: false }).waitFor();
      await page.locator('header').waitFor();
      await page.locator('main h1').waitFor();
      await page.waitForFunction(() => ['--font-fraunces', '--font-inter'].every(variable => {
        const family = globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue(variable).split(',')[0].trim().replaceAll('"', '').replaceAll("'", '');
        return family && Array.from(globalThis.document.fonts).some(font => font.family.replaceAll('"', '').replaceAll("'", '') === family && font.status === 'loaded');
      }), null, { timeout: 120000 });
      await page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
      check(`public_preview_banner_${width}_fits`, await fits());
      await context.close();
    }
    check('browser_no_runtime_exceptions', report.pageErrors.length === 0);
  } finally { await browser.close(); }
}
