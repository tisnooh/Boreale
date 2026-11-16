import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { emailTemplates, sendEmail } from './email.js';
import { toOrderDTO } from './orders.js';
import type { PaymentSettlement, SettlePaymentInput } from '../repositories/orders.js';
import { recoverCheckoutSession } from './checkout-recovery.js';

/**
 * Stripe webhook handling — dependency-injected so it is unit-testable without
 * Stripe/Supabase (see test/webhook.test.ts). Signature verification happens in
 * the controller with the raw body BEFORE reaching this service.
 */

export interface StripeEventLike {
  id?: string;
  type: string;
  data: {
    object: Record<string, unknown> & {
      id?: string;
      payment_status?: string;
      payment_intent?: string | { id?: string } | null;
      amount?: number;
      amount_refunded?: number;
      metadata?: Record<string, string>;
    };
  };
}

export interface OrderRowLike {
  id: string;
  number: string;
  status: string;
  email: string;
  total_cents: number;
  discount_code: string | null;
  order_items?: { variant_id: string | null; quantity: number }[];
  [key: string]: unknown;
}

export interface WebhookDeps {
  getOrderBySessionId(sessionId: string): Promise<OrderRowLike | null>;
  recoverCheckoutSession?(event: StripeEventLike): Promise<OrderRowLike | null>;
  settlePayment(input: SettlePaymentInput): Promise<PaymentSettlement>;
  cancelOrder(orderId: string, reason: string): Promise<boolean>;
  handleRefund(paymentIntentId: string, amountRefundedCents: number, amountCents: number): Promise<void>;
  markPaymentFailed(orderId: string, sessionId: string | null): Promise<void>;
}

function paymentIntentId(obj: StripeEventLike['data']['object']): string | null {
  const pi = obj.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id ?? null;
}

export async function handleWebhookEvent(event: StripeEventLike, deps: WebhookDeps): Promise<{ handled: boolean; type: string }> {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const sessionId = obj.id;
      if (obj.payment_status !== 'paid') {
        logger.info('webhook_ignored', { type: event.type, reason: 'session not paid' });
        return { handled: false, type: event.type };
      }
      const intent = paymentIntentId(obj);
      if (typeof event.id !== 'string' || !event.id.trim() || typeof sessionId !== 'string' || !sessionId.trim()
        || typeof intent !== 'string' || !intent.trim()) {
        throw AppError.badRequest('payment_identity_missing', 'Identifiants d’événement, de session et de paiement requis.');
      }
      if (!Number.isSafeInteger(obj.amount_total) || (obj.amount_total as number) <= 0
        || typeof obj.currency !== 'string' || !/^[a-z]{3}$/i.test(obj.currency)) {
        throw AppError.conflict('payment_amount_mismatch', 'Le montant ou la devise du paiement est invalide.');
      }
      const order = await deps.getOrderBySessionId(sessionId) ?? await deps.recoverCheckoutSession?.(event);
      if (!order) {
        logger.warn('webhook_order_not_found', { sessionId });
        throw AppError.serviceUnavailable('payment_order_unresolved', 'Paiement reçu sans commande associée ; rapprochement et nouvelle tentative nécessaires.');
      }
      if (obj.amount_total !== order.total_cents || typeof obj.currency !== 'string' || obj.currency.toUpperCase() !== order.currency) {
        throw AppError.conflict('payment_amount_mismatch', 'Le montant ou la devise du paiement ne correspond pas à la commande.');
      }
      // The RPC locks the order and owns payment, stock, incident, event and
      // notification-outbox writes. Call it for paid orders too: only durable
      // database state can decide whether an event/session is a duplicate.
      const settlement = await deps.settlePayment({
        eventId: event.id,
        sessionId,
        paymentIntentId: intent,
        amountCents: obj.amount_total as number,
        currency: obj.currency.toUpperCase(),
      });
      logger.info('order_payment_recorded', {
        orderId: settlement.order_id,
        duplicate: settlement.duplicate,
        fulfillmentStatus: settlement.fulfillment_status,
        incidentCode: settlement.incident_code,
      });
      return { handled: true, type: event.type };
    }

    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const sessionId = obj.id;
      if (!sessionId) return { handled: false, type: event.type };
      const order = await deps.getOrderBySessionId(sessionId) ?? await deps.recoverCheckoutSession?.(event);
      if (!order) throw AppError.serviceUnavailable('payment_order_unresolved', 'L’événement doit être rapproché avant acquittement.');
      if (order && order.status === 'pending') {
        const cancelled = await deps.cancelOrder(order.id, event.type);
        if (cancelled) logger.info('order_cancelled_by_webhook', { orderId: order.id, type: event.type });
      }
      return { handled: true, type: event.type };
    }

    case 'charge.refunded': {
      const intent = paymentIntentId(obj);
      if (!intent) return { handled: false, type: event.type };
      const amount = typeof obj.amount === 'number' ? obj.amount : 0;
      const refunded = typeof obj.amount_refunded === 'number' ? obj.amount_refunded : amount;
      await deps.handleRefund(intent, refunded, amount);
      return { handled: true, type: event.type };
    }

    case 'payment_intent.payment_failed': {
      const intent = paymentIntentId(obj);
      const orderId = obj.metadata?.orderId;
      if (orderId) {
        await deps.markPaymentFailed(orderId, null);
      }
      logger.info('payment_failed', { intent, orderId });
      return { handled: true, type: event.type };
    }

    default:
      logger.debug('webhook_unhandled_type', { type: event.type });
      return { handled: false, type: event.type };
  }
}

/** Default wiring against real repositories (used by the controller). */
export interface DefaultWebhookRepos {
  ordersRepo: {
    getBySessionId(sessionId: string): Promise<OrderRowLike | null>;
    settlePayment(input: SettlePaymentInput): Promise<PaymentSettlement>;
    cancelPending(id: string, reason: string): Promise<boolean>;
    setStatus(id: string, status: OrderStatusArg, extra?: Record<string, unknown>): Promise<unknown>;
    addEvent(orderId: string, type: string, data?: Record<string, unknown>): Promise<void>;
    updatePaymentBySession(sessionId: string, patch: Record<string, unknown>): Promise<void>;
    getPaymentByIntentId(intentId: string): Promise<{ order_id: string; refunded_cents: number; amount_cents: number } | null>;
    markPaymentRefunded(orderId: string, refundedCents: number, totalRefundedCents: number, amountCents: number): Promise<void>;
    getById(id: string): Promise<OrderRowLike | null>;
  };
}

type OrderStatusArg = 'paid' | 'cancelled' | 'refunded' | 'partially_refunded' | string;

export function buildDefaultWebhookDeps(repos: DefaultWebhookRepos): WebhookDeps {
  return {
    recoverCheckoutSession,
    async getOrderBySessionId(sessionId) {
      return repos.ordersRepo.getBySessionId(sessionId);
    },
    settlePayment: (input) => repos.ordersRepo.settlePayment(input),
    cancelOrder: (orderId, reason) => repos.ordersRepo.cancelPending(orderId, reason),
    async handleRefund(paymentIntentId, amountRefundedCents, amountCents) {
      const payment = await repos.ordersRepo.getPaymentByIntentId(paymentIntentId);
      if (!payment) {
        logger.warn('refund_payment_not_found', { paymentIntentId });
        throw AppError.serviceUnavailable('refund_payment_unresolved', 'Remboursement reçu sans paiement associé ; une nouvelle tentative est nécessaire.');
      }
      const full = amountRefundedCents >= amountCents;
      const totalRefunded = amountRefundedCents; // charge.amount_refunded is cumulative
      await repos.ordersRepo.markPaymentRefunded(payment.order_id, totalRefunded, totalRefunded, amountCents);
      await repos.ordersRepo.setStatus(payment.order_id, full ? 'refunded' : 'partially_refunded');
      await repos.ordersRepo.addEvent(payment.order_id, full ? 'refund_full' : 'refund_partial', {
        amountRefundedCents,
      });
      const order = await repos.ordersRepo.getById(payment.order_id);
      if (order) {
        const dto = toOrderDTO(order as never);
        await sendEmail(emailTemplates.refund(dto, totalRefunded, full)).catch(() => undefined);
      }
    },
    async markPaymentFailed(orderId, sessionId) {
      if (sessionId) await repos.ordersRepo.updatePaymentBySession(sessionId, { status: 'failed' });
      await repos.ordersRepo.addEvent(orderId, 'payment_failed', {});
    },
  };
}

export function assertWebhookConfigured(): void {
  // Lazy import avoided: controller checks config().STRIPE_WEBHOOK_SECRET before calling.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw AppError.serviceUnavailable('webhook_not_configured', 'STRIPE_WEBHOOK_SECRET manquant.');
  }
}
