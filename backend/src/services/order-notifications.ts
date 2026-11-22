import { z } from 'zod';
import { config, features } from '../config.js';
import { db } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';
import { ordersRepo } from '../repositories/orders.js';
import { toOrderDTO } from './orders.js';
import type { OrderDTO } from '../types/index.js';

const address = z.string().email().max(254);
const bodySchema = z.object({
  from: z.string().min(1).max(320).refine(s => !/[\r\n]/.test(s) && address.safeParse(s.match(/<([^<>]+)>$/)?.[1] ?? s).success),
  to: address, subject: z.string().min(1).max(200).regex(/^[^\r\n]+$/), html: z.string().min(1).max(100000),
}).strict();
export type ConfirmationBody = z.infer<typeof bodySchema>;

export function isOrderEmailSenderValid(from: string): boolean {
  return bodySchema.shape.from.safeParse(from).success;
}
type Failure = 'provider_unavailable' | 'provider_unconfirmed' | 'order_unverified' | 'recipient_not_allowed' | 'payload_invalid';
export interface ConfirmationJob { id: string; order_id: string; delivery_token: string }
export interface ConfirmationSettings { mode: 'off' | 'test' | 'live'; from: string; configured: boolean; testRecipients: string[] }
export interface ConfirmationDeps {
  claim(limit: number, testRecipients: string[] | null): Promise<ConfirmationJob[]>;
  load(orderId: string): Promise<{ order: OrderDTO; amountCents: number; currency: string } | null>;
  freeze(job: ConfirmationJob, body: ConfirmationBody): Promise<unknown>;
  finish(job: ConfirmationJob, providerId: string | null, error: Failure | null): Promise<boolean>;
  send(body: ConfirmationBody, key: string): Promise<string>;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
export function confirmationBody(order: OrderDTO, from: string): ConfirmationBody {
  const rows = order.items.map(item => `<li>${escapeHtml(item.productName)}${item.variantTitle ? ' — ' + escapeHtml(item.variantTitle) : ''} × ${item.quantity}</li>`).join('');
  const notice = order.fulfillmentStatus === 'blocked'
    ? 'Votre paiement est enregistré. Votre commande nécessite une vérification avant préparation. Aucun délai d’expédition n’est confirmé.'
    : 'Votre paiement est enregistré et votre commande a bien été reçue.';
  return bodySchema.parse({ from, to: order.email.toLowerCase(), subject: `BORÉALE — commande ${order.number}`,
    html: `<html lang="fr"><body><h1>Commande ${escapeHtml(order.number)}</h1><p>${notice}</p><ul>${rows}</ul><p>Total payé : ${(order.totalCents / 100).toFixed(2)} ${escapeHtml(order.currency)}</p></body></html>` });
}

/** Provider acceptance is not proof of delivery. Stable key/body, maximum retry age 23h (provider retention 24h). */
export async function sendConfirmationToProvider(body: ConfirmationBody, key: string): Promise<string> {
  if (!features.email()) throw AppError.serviceUnavailable('email_not_configured');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${config().EMAIL_API_KEY!}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(bodySchema.parse(body)) });
  if (!response.ok) throw AppError.serviceUnavailable('email_provider_unavailable');
  const ack = await response.json() as { id?: unknown };
  if (typeof ack.id !== 'string' || !ack.id || ack.id.length > 200) throw AppError.serviceUnavailable('email_provider_unconfirmed');
  return ack.id;
}
const defaultDeps: ConfirmationDeps = {
  async claim(limit, testRecipients) {
    const { data, error } = await db().rpc('claim_order_confirmations', { p_limit: limit, p_test_recipients: testRecipients });
    if (error || !Array.isArray(data)) throw AppError.serviceUnavailable('notification_claim_unavailable');
    return data as ConfirmationJob[];
  },
  async load(id) {
    const [row, settlement] = await Promise.all([
      ordersRepo.getById(id), db().from('order_payment_settlements').select('amount_cents,currency').eq('order_id', id).maybeSingle(),
    ]);
    if (settlement.error) throw AppError.serviceUnavailable('notification_payment_unavailable');
    if (!row || !settlement.data) return null;
    return { order: toOrderDTO(row), amountCents: settlement.data.amount_cents as number, currency: settlement.data.currency as string };
  },
  async freeze(job, body) {
    const { data, error } = await db().rpc('freeze_order_confirmation', { p_id: job.id, p_token: job.delivery_token, p_body: body });
    if (error) throw AppError.serviceUnavailable('notification_prepare_unavailable');
    return data;
  },
  async finish(job, providerId, errorCode) {
    const { data, error } = await db().rpc('finish_order_confirmation', {
      p_id: job.id, p_token: job.delivery_token, p_provider_id: providerId, p_error: errorCode,
    });
    if (error || typeof data !== 'boolean') throw AppError.serviceUnavailable('notification_ack_unavailable');
    return data;
  },
  send: sendConfirmationToProvider,
};
function settings(): ConfirmationSettings {
  const cfg = config();
  return { mode: cfg.ORDER_EMAIL_MODE ?? 'off', configured: features.email(), from: cfg.EMAIL_FROM,
    testRecipients: (cfg.ORDER_EMAIL_TEST_RECIPIENTS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean) };
}

export async function runOrderConfirmations(deps: ConfirmationDeps = defaultDeps, options: ConfirmationSettings = settings()) {
  if (options.mode === 'off' || !options.configured) throw AppError.serviceUnavailable('order_emails_disabled', 'Les confirmations de commande sont désactivées.');
  if (!isOrderEmailSenderValid(options.from)) throw AppError.serviceUnavailable('email_sender_required', 'Une adresse expéditrice valide est requise avant de traiter la file.');
  if (options.mode === 'test' && (!options.testRecipients.length || options.testRecipients.length > 20 || options.testRecipients.some(s => !address.safeParse(s).success))) {
    throw AppError.serviceUnavailable('email_test_recipients_required', 'Destinataires de test exacts requis.');
  }
  const jobs = await deps.claim(2, options.mode === 'test' ? options.testRecipients : null);
  const result = { claimed: jobs.length, accepted: 0, failed: 0 };
  for (const job of jobs) {
    let providerId: string | null = null;
    let failure: Failure | null = null;
    try {
      const paid = await deps.load(job.order_id);
      if (!paid || !['paid', 'processing', 'shipped', 'delivered'].includes(paid.order.status)
        || !paid.order.paidAt || !Number.isSafeInteger(paid.amountCents) || paid.amountCents <= 0
        || paid.order.totalCents !== paid.amountCents || paid.order.currency !== paid.currency || !paid.order.items.length) failure = 'order_unverified';
      else {
        const candidate = confirmationBody(paid.order, options.from);
        const frozen = bodySchema.parse(await deps.freeze(job, candidate));
        if (frozen.to !== paid.order.email.toLowerCase()) failure = 'payload_invalid';
        else if (options.mode === 'test' && !options.testRecipients.includes(frozen.to)) failure = 'recipient_not_allowed';
        else providerId = await deps.send(frozen, 'boreale-confirmation/' + job.id);
      }
    } catch (error) {
      failure = error instanceof z.ZodError ? 'payload_invalid' : 'provider_unavailable';
    }
    if (!providerId && !failure) failure = 'provider_unconfirmed';
    // Never turn an uncertain persistence acknowledgement into a fresh send.
    // Let the lease expire; subsequent attempts reuse the frozen body and provider key.
    if (!await deps.finish(job, providerId, failure)) throw AppError.conflict('notification_lease_lost', 'Le résultat doit être rapproché avant une nouvelle tentative.');
    if (providerId) result.accepted++; else result.failed++;
  }
  return result;
}
