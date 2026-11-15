/* Standalone local-browser audit. Playwright is installed outside the app. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.BOREALE_PLAYWRIGHT_MODULE || 'playwright-core');

const base = process.env.BOREALE_AUDIT_URL || 'http://127.0.0.1:3102';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Local preview only');
const output = process.env.BOREALE_AUDIT_OUTPUT || path.resolve(__dirname, '../../../../outputs/boreale-responsive');
const screens = [[320, 740], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [844, 390]];
const results = { engine: 'Chromium', physicalDevices: false, completedScreens: [], checks: [], failures: [], pageErrors: [], mutations: [], isolatedAuthRequests: [] };
function check(name, condition, detail) {
  results.checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) results.failures.push({ name, detail });
}
async function dimensions(page, name) {
  // Wait for visible images and SafeImage's asynchronous error fallback before
  // judging the rendered state. Offscreen lazy images need not be downloaded.
  await page.waitForFunction(() => Array.from(document.images).every(image => {
    const box = image.getBoundingClientRect();
    const visible = box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight;
    return visible ? image.complete && image.naturalWidth > 0 : !image.complete || image.naturalWidth > 0;
  }), undefined, { timeout: 10000 }).catch(() => undefined);
  const measurement = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  check(name, measurement.content <= measurement.viewport, measurement);
  const brokenImages = await page.locator('img').evaluateAll(images => images
    .filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src')));
  check(`${name}_images`, brokenImages.length === 0, brokenImages);
  const pendingVisibleImages = await page.locator('img').evaluateAll(images => images.filter(image => {
    const box = image.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight && (!image.complete || image.naturalWidth === 0);
  }).map(image => image.getAttribute('src')));
  check(`${name}_visible_images_ready`, pendingVisibleImages.length === 0, pendingVisibleImages);
}
async function waitForFonts(page) {
  await page.waitForFunction(() => ['--font-fraunces', '--font-inter'].every(variable => {
    const family = getComputedStyle(document.documentElement).getPropertyValue(variable).split(',')[0].trim().replaceAll('"', '').replaceAll("'", '');
    return family && Array.from(document.fonts).some(font => font.family.replaceAll('"', '').replaceAll("'", '') === family && font.status === 'loaded');
  }));
}
async function capture(page, name) {
  await page.screenshot({ path: path.join(output, name + '.jpg'), type: 'jpeg', quality: 80, animations: 'disabled' });
}
async function navigateThroughUI(page, route) {
  if (route === '/cart') {
    await page.getByRole('button', { name: /Panier \(/ }).click();
  }
  let link = page.locator(`a[href="${route}"]`).filter({ visible: true }).first();
  if (route === '/ete' && !(await link.isVisible())) {
    await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
    link = page.locator(`a[href="${route}"]`).filter({ visible: true }).first();
  }
  await link.click();
  await page.waitForURL(`**${route}`, { waitUntil: 'commit' });
  const headings = {
    '/cart': /Votre panier/, '/checkout': /Paiement sécurisé/, '/account': /Mon compte/,
    '/track-order': /Suivi de commande/, '/faq': /Questions fréquentes/,
    '/contact': /^Contact$/, '/ete': /L’été/,
  };
  await page.locator('main h1').filter({ hasText: headings[route] }).waitFor({ state: 'visible' });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  const candidates = [process.env.BOREALE_CHROMIUM_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
  let executablePath;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try { await fs.access(candidate); executablePath = candidate; break; } catch { /* Try next installed browser. */ }
  }
  // Prefer installed Chrome/Edge; otherwise use the separately installed
  // Playwright Chromium. This script never downloads browser binaries itself.
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  results.browserVersion = browser.version();
  try {
    for (const [width, height] of screens) {
      const key = `${width}x${height}`;
      const context = await browser.newContext({ viewport: { width, height }, locale: 'fr-FR',
        reducedMotion: 'reduce', isMobile: width < 768, hasTouch: width < 1024 });
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const localAuth = ['localhost', '127.0.0.1'].includes(url.hostname) &&
          ((request.method() === 'POST' && url.pathname === '/api/auth/refresh') || (request.method() === 'GET' && url.pathname === '/api/me'));
        if (localAuth) {
          results.isolatedAuthRequests.push({ method: request.method(), url: request.url() });
          return route.fulfill({ status: 401, headers: { 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true' }, contentType: 'application/json', body: JSON.stringify({ error: { code: 'audit_no_session', message: 'Isolated visual audit' } }) });
        }
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
        results.mutations.push({ method: request.method(), url: request.url() });
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      // Functional readiness budget on the constrained local host. This is not
      // a performance threshold; all page-specific UI assertions remain required.
      page.setDefaultTimeout(120000);
      page.setDefaultNavigationTimeout(120000);
      page.on('pageerror', error => results.pageErrors.push({ screen: key, message: error.message }));
      try {
        console.log(JSON.stringify({ screen: key, stage: 'loading' }));
        await page.goto(base, { waitUntil: 'commit' });
        await page.locator('header').waitFor({ state: 'visible' });
        console.log(JSON.stringify({ screen: key, stage: 'header', diagnostic: await page.locator('header').evaluate(el => {
          const ancestors = [];
          for (let current = el; current; current = current.parentElement) ancestors.push({ tag: current.tagName, role: current.getAttribute('role'), hidden: current.getAttribute('aria-hidden'), inert: current.inert });
          return { readyState: document.readyState, ancestors };
        }), bannerCount: await page.getByRole('banner').count() }));
        assert.match(await page.locator('body').innerText(), /Mode preview/, 'No business operations outside preview');
        await page.locator('main h1').filter({ hasText: /L’hiver/ }).waitFor({ state: 'visible' });
        await waitForFonts(page);
        console.log(JSON.stringify({ screen: key, stage: 'home_ready' }));
        await dimensions(page, `home_${key}`);
        const titleLinesVisible = await page.locator('main h1 .line-mask').evaluateAll(masks => masks.length > 0 && masks.every(mask => {
          const content = mask.firstElementChild;
          if (!content) return false;
          const outer = mask.getBoundingClientRect();
          const inner = content.getBoundingClientRect();
          return inner.height > 0 && inner.bottom > outer.top + 1 && inner.top < outer.bottom - 1;
        }));
        check(`reduced_motion_title_visible_${key}`, titleLinesVisible);
        const account = await page.getByRole('link', { name: 'Se connecter', exact: true }).boundingBox();
        const cartButton = page.getByRole('button', { name: /Panier \(/ });
        const cart = await cartButton.boundingBox();
        check(`header_actions_${key}`, account && cart && account.x >= 0 && cart.x + cart.width <= width, { account, cart });
        check(`fonts_loaded_${key}`, await page.evaluate(() => ['--font-fraunces', '--font-inter'].every(variable => {
          const family = getComputedStyle(document.documentElement).getPropertyValue(variable).split(',')[0].trim().replaceAll('"', '').replaceAll("'", '');
          const faces = Array.from(document.fonts).filter(font => font.family.replaceAll('"', '').replaceAll("'", '') === family);
          return faces.length > 0 && faces.some(font => font.status === 'loaded');
        })));
        if ([390, 768, 1440].includes(width)) await capture(page, `accueil-${width}`);

        if (await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).isVisible()) {
          await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
          const mobileNav = page.getByRole('navigation', { name: 'Navigation mobile', exact: true });
          const navBox = await mobileNav.boundingBox();
          check(`menu_within_height_${key}`, navBox && navBox.y + navBox.height <= height + 1, navBox);
          await mobileNav.getByRole('link', { name: 'Contact', exact: true }).scrollIntoViewIfNeeded();
          if (height === 390) await capture(page, 'menu-paysage');
          await mobileNav.getByRole('link', { name: 'Contact', exact: true }).click();
          await page.waitForURL('**/contact');
          check(`menu_last_link_${key}`, new URL(page.url()).pathname === '/contact');
        }

        await page.locator('a[href="/collections"]').filter({ visible: true }).first().click();
        await page.waitForURL('**/collections');
        await page.locator('main h1').filter({ hasText: /Toute la collection hiver/ }).waitFor({ state: 'visible' });
        await dimensions(page, `collections_${key}`);
        await page.locator('a[href="/products/chaussettes-polaires-nuage"]').first().click();
        await page.waitForURL('**/products/chaussettes-polaires-nuage');
        await page.getByRole('button', { name: /Ajouter au panier/i }).waitFor({ state: 'visible' });
        await dimensions(page, `product_${key}`);
        const addButton = page.getByRole('button', { name: /Ajouter au panier/i });
        const previousOverflow = await page.evaluate(() => document.body.style.overflow);
        await addButton.click();
        const drawer = page.getByRole('dialog', { name: 'Panier', exact: true });
        await drawer.waitFor({ state: 'visible' });
        check(`drawer_scroll_lock_${key}`, await page.evaluate(() => document.body.style.overflow === 'hidden'));
        const increase = drawer.getByRole('button', { name: /Augmenter/i });
        await increase.click();
        check(`quantity_keeps_focus_${key}`, await increase.evaluate(el => document.activeElement === el));
        const controls = drawer.locator('a[href]:visible,button:enabled:visible,input:enabled:visible,select:enabled:visible,textarea:enabled:visible');
        await controls.last().focus();
        await page.keyboard.press('Tab');
        check(`tab_wrap_${key}`, await controls.first().evaluate(el => document.activeElement === el));
        await controls.first().focus();
        await page.keyboard.press('Shift+Tab');
        check(`shift_tab_wrap_${key}`, await controls.last().evaluate(el => document.activeElement === el));
        if (width === 390) await capture(page, 'panier-mobile');
        await page.keyboard.press('Escape');
        await drawer.waitFor({ state: 'hidden' });
        check(`closed_drawer_restores_scroll_${key}`, await page.evaluate(previous => document.body.style.overflow === previous, previousOverflow));
        check(`closed_drawer_restores_focus_${key}`, await addButton.evaluate(el => document.activeElement === el));
        check(`closed_drawer_inert_${key}`, await page.locator('[inert]').count() > 0);
        for (let step = 0; step < 16; step++) {
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[inert]'))), false);
        }
        check(`closed_drawer_not_tabbable_${key}`, true);
        console.log(JSON.stringify({ screen: key, stage: 'cart_interactions_complete' }));

        for (const route of ['/cart', '/checkout', '/account', '/track-order', '/faq', '/contact', '/ete']) {
          console.log(JSON.stringify({ screen: key, stage: route }));
          await navigateThroughUI(page, route);
          if (route === '/cart') await page.getByRole('button', { name: /Augmenter/i }).first().waitFor({ state: 'visible' });
          if (route === '/checkout') await page.locator('main form').first().waitFor({ state: 'visible' });
          await dimensions(page, `${route.slice(1)}_${key}`);
          if (route === '/ete' && width === 1280) await capture(page, 'ete-1280');
          if (route === '/checkout' && [390, 768, 1440].includes(width)) await capture(page, `checkout-${width}`);
        }
        results.completedScreens.push(key);
      } catch (error) {
        check(`scenario_${key}`, false, error.message);
        console.error(JSON.stringify({ screen: key, error: error.message, url: page.url() }));
        await capture(page, `failure-${key}`).catch(() => undefined);
        break;
      } finally {
        await context.close();
        console.log(JSON.stringify({ screen: key, checks: results.checks.length, failures: results.failures.length }));
      }
    }
    check('all_screens_completed', results.completedScreens.length === screens.length, results.completedScreens);
    check('no_browser_runtime_errors', results.pageErrors.length === 0, results.pageErrors);
    check('no_unexpected_mutation_attempts', results.mutations.length === 0, results.mutations);
  } finally {
    await browser.close();
    await fs.writeFile(path.join(output, 'responsive-results.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ checks: results.checks.length, failed: results.failures.length, output }));
  if (results.failures.length) process.exitCode = 1;
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
