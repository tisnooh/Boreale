// Read-only sandbox preflight. No payment, product, webhook or configuration is created.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';

const report = { mode: 'test', mutations: 0, accountVerified: false, webhookConfigured: false };
function blocked(reason) {
  console.log(JSON.stringify({ ...report, status: 'BLOCKED', reason }));
  process.exitCode = 2;
}
async function verify() {
  const file = resolve(process.cwd(), '.env.stripe.local');
  if (existsSync(file)) process.loadEnvFile(file);
  const account = process.env.STRIPE_ACCOUNT_ID;
  const key = process.env.STRIPE_SECRET_KEY;
  if (process.env.STRIPE_MODE !== 'test') return blocked('explicit_test_mode_required');
  if (account !== 'acct_1Uc6bxGLTNMkV9aW') return blocked('owner_selected_sandbox_required');
  if (!key) return blocked('runtime_key_missing');
  if (!/^(?:rk|sk)_test_/.test(key)) return blocked('test_key_required');
  const { default: Stripe } = await import('stripe');
  const client = new Stripe(key, { apiVersion: '2024-09-30.acacia', timeout: 10000, maxNetworkRetries: 0 });
  const actual = await client.accounts.retrieve();
  if (actual.id !== account) return blocked('runtime_key_account_mismatch');
  report.accountVerified = true;
  const endpoints = await client.webhookEndpoints.list({ limit: 100 });
  report.enabledTestWebhookCount = endpoints.data.filter(endpoint => endpoint.livemode === false && endpoint.status === 'enabled').length;
  report.webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  report.moreWebhooksNotInspected = endpoints.has_more;
  console.log(JSON.stringify({ ...report, status: 'ACCOUNT_VERIFIED',
    purchaseJourneyVerified: false, note: 'Webhook delivery and full purchase still require isolated end-to-end testing.' }));
}
verify().catch(() => blocked('sandbox_access_unverified'));
