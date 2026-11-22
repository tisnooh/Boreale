import { z } from 'zod';
import type Stripe from 'stripe';
import { stripe } from '../lib/stripe.js';
import { ensureStripeEnvironment } from '../lib/stripe-environment.js';
import { AppError } from '../lib/errors.js';
import { checkoutIntentsRepo, type CheckoutIntent } from '../repositories/checkout-intents.js';
import { ordersRepo } from '../repositories/orders.js';
import type { OrderRowLike, StripeEventLike } from './webhooks.js';

export interface CheckoutRecoveryDeps {
  environment(): Promise<{ accountId: string; livemode: boolean }>;
  retrieve(id: string): Promise<Stripe.Checkout.Session>;
  intent(id: string): Promise<CheckoutIntent | null>;
  bind(id: string, session: Stripe.Checkout.Session): Promise<unknown>;
  order(id: string): Promise<OrderRowLike | null>;
}
const defaultDeps: CheckoutRecoveryDeps = {
  environment: ensureStripeEnvironment,
  retrieve: id => stripe().checkout.sessions.retrieve(id, { timeout: 10000, maxNetworkRetries: 0 }),
  intent: id => checkoutIntentsRepo.getById(id),
  bind: (id, session) => checkoutIntentsRepo.bind(id, null, session),
  order: id => ordersRepo.getBySessionId(id) as Promise<OrderRowLike | null>,
};

/** Called only after webhook signature verification. Resolve an early event without trusting metadata alone. */
export async function recoverCheckoutSession(event: StripeEventLike, deps: CheckoutRecoveryDeps = defaultDeps): Promise<OrderRowLike | null> {
  const object = event.data.object;
  if (typeof object.id !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(object.id)) return null;
  const environment = await deps.environment();
  const session = await deps.retrieve(object.id);
  const meta = session.metadata;
  if (!z.string().uuid().safeParse(meta?.checkoutIntentId).success || meta?.brand !== 'boreale') return null;
  const intent = await deps.intent(meta!.checkoutIntentId!);
  if (!intent) return null;
  const frozen = intent.stripe_params?.metadata;
  const mismatch = () => AppError.conflict('checkout_recovery_mismatch', 'Le paiement doit être rapproché avant de confirmer la commande.');
  if (!frozen || session.id !== object.id || session.livemode !== environment.livemode
    || meta!.orderId !== intent.order_id || meta!.orderNumber !== intent.order_number
    || meta!.stripeAccountId !== environment.accountId || frozen.stripeAccountId !== environment.accountId
    || meta!.stripeMode !== (environment.livemode ? 'live' : 'test') || frozen.stripeMode !== meta!.stripeMode
    || frozen.checkoutIntentId !== intent.id || frozen.orderId !== intent.order_id
    || session.amount_total !== intent.snapshot.totals.totalCents
    || session.currency?.toUpperCase() !== intent.snapshot.totals.currency
    || (intent.session_id !== null && intent.session_id !== session.id)) throw mismatch();
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const actualIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    const eventIntent = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
    if (session.payment_status !== 'paid' || session.status !== 'complete' || actualIntent !== eventIntent) throw mismatch();
  } else if (event.type === 'checkout.session.expired') {
    if (session.status !== 'expired' || session.payment_status === 'paid') throw mismatch();
  } else if (event.type === 'checkout.session.async_payment_failed') {
    if (session.status !== 'complete' || session.payment_status === 'paid') throw mismatch();
  } else return null;
  await deps.bind(intent.id, session);
  return deps.order(session.id);
}
