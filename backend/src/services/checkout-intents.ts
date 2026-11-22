import { createHash } from 'node:crypto';
import { z } from 'zod';
import type Stripe from 'stripe';
import { stripe } from '../lib/stripe.js';
import { ensureStripeEnvironment } from '../lib/stripe-environment.js';
import { AppError } from '../lib/errors.js';
import { checkoutIntentsRepo, type CheckoutIdentity, type CheckoutIntent, type CheckoutSnapshot } from '../repositories/checkout-intents.js';
import type { CheckoutInput } from '../validators/checkout.js';

export interface IntentSession {
  id: string; url: string | null; status: string | null; expires_at: number;
  amount_total: number | null; currency: string | null;
  metadata: Record<string, string> | null;
  livemode?: boolean;
}
export interface CheckoutIntentDeps {
  begin(identity: CheckoutIdentity, snapshot?: CheckoutSnapshot | null, customer?: CheckoutInput['customer'] | null): Promise<CheckoutIntent | null>;
  freeze(id: string, params: Stripe.Checkout.SessionCreateParams): Promise<CheckoutIntent>;
  claim(id: string): Promise<CheckoutIntent>;
  bind(id: string, token: string | null, session: IntentSession): Promise<CheckoutIntent>;
  fail(id: string, token: string): Promise<void>;
  create(params: Stripe.Checkout.SessionCreateParams, key: string): Promise<IntentSession>;
  retrieve(id: string): Promise<IntentSession>;
  now(): number;
}
export const defaultCheckoutIntentDeps: CheckoutIntentDeps = {
  ...checkoutIntentsRepo,
  create: async (params, key) => {
    const verified = await ensureStripeEnvironment();
    const metadata = params.metadata;
    if (metadata?.stripeAccountId !== verified.accountId || metadata?.stripeMode !== (verified.livemode ? 'live' : 'test')) {
      throw AppError.serviceUnavailable('checkout_provider_scope_changed', 'Le compte de paiement de cette tentative doit être rapproché.');
    }
    const session = await stripe().checkout.sessions.create(params, { idempotencyKey: key, timeout: 10000, maxNetworkRetries: 0 });
    if (session.livemode !== verified.livemode) throw AppError.serviceUnavailable('checkout_provider_scope_changed');
    return session;
  },
  retrieve: async id => {
    const verified = await ensureStripeEnvironment();
    const session = await stripe().checkout.sessions.retrieve(id, { timeout: 10000, maxNetworkRetries: 0 });
    if (session.livemode !== verified.livemode || session.metadata?.stripeAccountId !== verified.accountId
      || session.metadata?.stripeMode !== (verified.livemode ? 'live' : 'test')) throw AppError.serviceUnavailable('checkout_provider_scope_changed');
    return session;
  },
  now: () => Date.now(),
};
function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function checkoutIdentity(input: CheckoutInput, actor: string | null): CheckoutIdentity {
  if (!z.string().uuid().safeParse(input.idempotencyKey).success || !input.customerMode) throw AppError.badRequest('checkout_identity_required', 'Une clé de tentative et un mode client sont requis.');
  if ((input.customerMode === 'customer') !== Boolean(actor)) throw AppError.unauthorized('checkout_identity_changed', 'Votre session a changé ; reconnectez-vous avant de reprendre.');
  // Explicit fields and sorted, merged quantities: no caller prices or insertion-order ambiguity.
  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  const request = { items: [...quantities].sort(([a], [b]) => a.localeCompare(b)),
    discountCode: input.discountCode?.trim().toUpperCase() || null, shippingMethod: input.shippingMethod,
    customer: { email: input.customer.email.trim().toLowerCase(), firstName: input.customer.firstName.trim(),
      lastName: input.customer.lastName.trim(), phone: input.customer.phone?.trim() || null,
      address: { line1: input.customer.address.line1.trim(), line2: input.customer.address.line2?.trim() || null,
        postalCode: input.customer.address.postalCode.trim(), city: input.customer.address.city.trim(), country: input.customer.address.country.toUpperCase() } } };
  return { actor, keyHash: digest(input.idempotencyKey!.toLowerCase()), requestHash: digest(JSON.stringify(request)) };
}
export function checkoutUrl(value: string | null): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Fail closed; never redirect to a caller/provider-controlled alternative. */ }
  throw AppError.serviceUnavailable('checkout_session_unconfirmed', 'La session de paiement doit être vérifiée.');
}
function checkSession(session: IntentSession, intent: CheckoutIntent, now: number) {
  if (session.metadata?.brand !== 'boreale' || session.metadata?.checkoutIntentId !== intent.id || session.metadata?.orderId !== intent.order_id
    || session.amount_total !== intent.snapshot.totals.totalCents || session.currency?.toUpperCase() !== intent.snapshot.totals.currency
    || !/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(session.id)
    || (intent.session_id !== null && session.id !== intent.session_id)) throw AppError.conflict('checkout_session_mismatch', 'La session ne correspond pas à la tentative.');
  if (session.status === 'complete') throw AppError.conflict('checkout_session_closed', 'Cette session est terminée ; aucun nouveau paiement n’a été créé.');
  if (session.status === 'expired') throw AppError.conflict('checkout_session_expired', 'L’expiration de cette session est confirmée ; aucun nouveau paiement n’a été créé.');
  if (session.status !== 'open' || !Number.isSafeInteger(session.expires_at) || session.expires_at * 1000 <= now) throw AppError.serviceUnavailable('checkout_session_unconfirmed', 'L’état de la session doit être vérifié.');
  checkoutUrl(session.url);
}
export async function runDurableCheckout(input: CheckoutInput, actor: string | null,
  quote: () => Promise<CheckoutSnapshot>, buildParams: (intent: CheckoutIntent) => Stripe.Checkout.SessionCreateParams,
  deps: CheckoutIntentDeps = defaultCheckoutIntentDeps) {
  const identity = checkoutIdentity(input, actor);
  let intent = await deps.begin(identity);
  if (!intent) intent = await deps.begin(identity, await quote(), input.customer);
  if (!intent || intent.request_hash !== identity.requestHash) throw AppError.conflict('checkout_intent_conflict', 'Le contenu de cette tentative a changé.');
  const result = (session: IntentSession) => ({ url: checkoutUrl(session.url), orderId: intent!.order_id,
    orderNumber: intent!.order_number, totals: intent!.snapshot.totals });
  if (intent.session_id) {
    const session = await deps.retrieve(intent.session_id);
    checkSession(session, intent, deps.now());
    return result(session);
  }
  if (intent.state === 'manual_review') throw AppError.conflict('checkout_reconciliation_required', 'Cette tentative nécessite un rapprochement.');
  if (!intent.stripe_params) intent = await deps.freeze(intent.id, buildParams(intent));
  intent = await deps.claim(intent.id);
  if (intent.session_id) {
    const session = await deps.retrieve(intent.session_id);
    checkSession(session, intent, deps.now());
    return result(session);
  }
  if (intent.state === 'manual_review') throw AppError.conflict('checkout_reconciliation_required', 'Cette tentative nécessite un rapprochement.');
  const deadline = new Date(intent.retry_deadline ?? '').getTime();
  if (!intent.lease_token || !intent.stripe_params || !Number.isFinite(deadline) || deadline <= deps.now()) throw AppError.conflict('checkout_attempt_busy', 'La tentative est en cours ou doit être rapprochée.');
  let session: IntentSession;
  try {
    session = await deps.create(intent.stripe_params, intent.stripe_key);
    checkSession(session, intent, deps.now());
  } catch (error) {
    await deps.fail(intent.id, intent.lease_token);
    if (error instanceof AppError) throw error;
    throw AppError.serviceUnavailable('checkout_provider_unconfirmed', 'Le paiement doit être repris avec la même clé.');
  }
  // Uncertain DB acknowledgement leaves the lease in place; retry uses the same provider key/body.
  await deps.bind(intent.id, intent.lease_token, session);
  return result(session);
}
