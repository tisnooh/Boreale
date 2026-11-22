/* Local UI evidence only: no payment, provider, production or physical-device claim. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.BOREALE_PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BOREALE_AUDIT_URL || 'http://127.0.0.1:3112';
const phase = process.env.BOREALE_AUDIT_PHASE || 'after';
const output = process.env.BOREALE_AUDIT_OUTPUT;
if (!output || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Explicit local output and loopback URL required');
const report = { phase, baseline: 'Working tree before merchandising edits; other agents may already have changed catalog data', physicalDevices: false, checks: [], screenshots: [], pageErrors: [], status: 'IN_PROGRESS' };
const deadline = setTimeout(() => { report.status = report.checks.some(c => !c.pass) || report.pageErrors.length ? 'FAILED' : 'BLOCKED'; report.error = 'Browser deadline exceeded'; fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify(report, null, 2)).finally(() => process.exit(2)); }, 110000);
async function run() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', err => report.pageErrors.push(err.message));
      await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.locator('body').waitFor({ timeout: 15000 });
      const style = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, ink: getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim(), font: getComputedStyle(document.body).fontFamily }));
      report.checks.push({ width, name: 'document_fits', pass: style.scrollWidth <= width, style });
      if (phase === 'after') {
        const selection = page.locator('#selection');
        const labels = await selection.locator('h3').allTextContents();
        report.checks.push({ width, name: 'priority_order', pass: ['Contact', 'Refuge', 'Braise', 'Nuage', 'Semelles'].every((v, i) => labels[i]?.includes(v)), labels });
        report.checks.push({ width, name: 'no_unverified_price', pass: !/0[,.]00\s*€/.test(await page.locator('body').innerText()) });
      }
      const file = `${phase}-home-${width}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: true, timeout: 15000 });
      report.screenshots.push(file);
      await context.close();
    }
    report.status = report.checks.every(c => c.pass) && !report.pageErrors.length ? 'PASS' : 'FAILED';
  } finally { await browser.close(); }
}
run().catch(error => { report.status = report.checks.some(c => !c.pass) || report.pageErrors.length ? 'FAILED' : 'BLOCKED'; report.error = error.message; }).finally(async () => {
  clearTimeout(deadline);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exitCode = report.status === 'PASS' ? 0 : 2;
});
