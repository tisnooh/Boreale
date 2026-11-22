// Read-only Resend readiness. Never calls /emails or changes configuration.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const email = /^[^\s<>@,]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/i;
export async function verifyEmailReadiness(env, fetcher = globalThis.fetch) {
  const mode = env.ORDER_EMAIL_MODE ?? 'off';
  const report = { status: 'BLOCKED', mode, sendsEnabledByThisTool: false, mutations: 0, emailsSent: 0,
    keyPresent: Boolean(env.EMAIL_API_KEY), senderValid: false, testRecipientCount: 0,
    domainVerified: false, deliveryVerified: false };
  const stop = reason => ({ ...report, reason });
  if (!['off', 'test', 'live'].includes(mode)) return stop('invalid_email_mode');
  const from = env.EMAIL_FROM ?? 'BORÉALE <bonjour@localhost>';
  const sender = from.match(/^[^<>\r\n]*<([^<>]+)>$/)?.[1] ?? from;
  const match = !/[\r\n]/.test(from) && email.exec(sender);
  if (!match) return stop('sender_domain_required');
  report.senderValid = true;
  const recipients = (env.ORDER_EMAIL_TEST_RECIPIENTS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  report.testRecipientCount = recipients.length;
  if (recipients.length > 20 || recipients.some(s => !email.test(s))) return stop('invalid_test_recipients');
  if (mode === 'test' && recipients.length === 0) return stop('authorized_test_recipient_required');
  if (!env.EMAIL_API_KEY) return stop('email_key_missing');
  const get = async path => {
    const response = await fetcher(`https://api.resend.com${path}`, {
      method: 'GET', redirect: 'error', headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}` },
      signal: globalThis.AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('unavailable');
    return response.json();
  };
  try {
    const domains = await get('/domains?limit=100');
    if (!Array.isArray(domains.data)) return stop('domain_read_unconfirmed');
    const domain = domains.data.find(d => d.name?.toLowerCase() === match[1].toLowerCase());
    if (!domain) return stop(domains.has_more ? 'domain_search_incomplete' : 'sender_domain_not_found');
    if (typeof domain.id !== 'string' || !domain.id || domain.id.length > 200) return stop('domain_read_unconfirmed');
    const detail = await get(`/domains/${encodeURIComponent(domain.id)}`);
    if (detail.name?.toLowerCase() !== match[1].toLowerCase() || !Array.isArray(detail.records)) return stop('domain_read_unconfirmed');
    report.pendingDnsRecordCount = detail.records.filter(r => r.status !== 'verified').length;
    report.domainVerified = domain.status === 'verified' && detail.status === 'verified'
      && domain.capabilities?.sending === 'enabled' && report.pendingDnsRecordCount === 0;
    if (!report.domainVerified) return stop('sender_dns_or_sending_unverified');
    return { ...report, status: 'DOMAIN_VERIFIED', reason: mode === 'off' ? 'sending_remains_off' : 'delivery_test_still_required' };
  } catch {
    return stop('domain_read_unavailable');
  }
}

async function main() {
  // Same private environment convention as the backend; never print contents.
  for (const name of ['.env.local', '.env.email.local']) {
    const file = resolve(process.cwd(), name);
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const report = await verifyEmailReadiness(process.env);
  console.log(JSON.stringify(report));
  if (report.status === 'BLOCKED') process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.log(JSON.stringify({ status: 'BLOCKED', reason: 'private_configuration_unreadable', emailsSent: 0, mutations: 0 })); process.exitCode = 2; });
}
