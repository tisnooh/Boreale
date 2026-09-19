import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { emailTemplates, sendEmail } from './email.js';
import { toOrderDTO } from './orders.js';
import type { OrderDTO } from '../types/index.js';

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

interface OrderRowLike {
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
  markPaid(orderId: string, paymentIntentId: string | null): Promise<void>;
  cancelOrder(orderId: string, reason: string): Promise<void>;
  decrementInventory(variantId: string, qty: number): Promise<number>;
  incrementDiscountUsage(code: string): Promise<void>;
  markCartConverted(email: string): Promise<void>;
  ensurePaymentSucceeded(orderId: string, sessionId: string, paymentIntentId: string | null, amountCents: number): Promise<void>;
  handleRefund(paymentIntentId: string, amountRefundedCents: number, amountCents: number): Promise<void>;
  markPaymentFailed(orderId: string, sessionId: string | null): Promise<void>;
  sendEmail(payload: { to: string; subject: string; html: string }): Promise<unknown>;
}

function paymentIntentId(obj: StripeEventLike['data']['object']): string | null {
  const pi = obj.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id ?? null;
}

export async function handleWebhookEvent(event: StripeEventLike, deps: WebhookDeps): Promise<{ handled: boolean; type: string }> {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionId = obj.id;
      if (!sessionId || obj.payment_status !== 'paid') {
        logger.info('webhook_ignored', { type: event.type, reason: 'session not paid' });
        return { handled: false, type: event.type };
      }
      const order = await deps.getOrderBySessionId(sessionId);
      if (!order) {
        logger.warn('webhook_order_not_found', { sessionId });
        return { handled: false, type: event.type };
      }
      if (order.status !== 'pending') {
        // Idempotency: already processed
        logger.info('webhook_already_processed', { orderId: order.id, status: order.status });
        return { handled: true, type: event.type };
      }
      const intent = paymentIntentId(obj);
      await deps.ensurePaymentSucceeded(order.id, sessionId, intent, order.total_cents);
      await deps.markPaid(order.id, intent);

      // Decrement stock (best effort per item — oversell is logged, never blocks a paid order)
      for (const item of order.order_items ?? []) {
        if (!item.variant_id) continue;
        try {
          await deps.decrementInventory(item.variant_id, item.quantity);
        } catch (err) {
          logger.warn('stock_decrement_failed', { variantId: item.variant_id, err: err instanceof Error ? err.message : String(err) });
        }
      }

      if (order.discount_code) {
        await deps.incrementDiscountUsage(order.discount_code).catch((e) => logger.warn('discount_usage_failed', e));
      }
      await deps.markCartConverted(order.email).catch(() => undefined);

      // Emails: confirmation + reçu + notification admin (failures never block the webhook)
      const dto = toOrderDTO(order as never);
      await Promise.allSettled([
        deps.sendEmail(emailTemplates.orderConfirmation(dto)),
        deps.sendEmail(emailTemplates.paymentReceipt(dto)),
        (async () => {
          const adminEmail = emailTemplates.adminOrderNotification(dto as OrderDTO);
          if (adminEmail) await sendEmail(adminEmail);
        })(),
      ]);

      logger.info('order_paid', { orderId: order.id, number: order.number });
      return { handled: true, type: event.type };
    }

    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const sessionId = obj.id;
      if (!sessionId) return { handled: false, type: event.type };
      const order = await deps.getOrderBySessionId(sessionId);
      if (order && order.status === 'pending') {
        await deps.cancelOrder(order.id, event.type);
        logger.info('order_cancelled_by_webhook', { orderId: order.id, type: event.type });
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
    setStatus(id: string, status: OrderStatusArg, extra?: Record<string, unknown>): Promise<unknown>;
    addEvent(orderId: string, type: string, data?: Record<string, unknown>): Promise<void>;
    updatePaymentBySession(sessionId: string, patch: Record<string, unknown>): Promise<void>;
    getPaymentByOrderId(orderId: string): Promise<{ id: string } | null>;
    createPayment(orderId: string, amountCents: number, currency: string, sessionId: string): Promise<void>;
    getPaymentByIntentId(intentId: string): Promise<{ order_id: string; refunded_cents: number; amount_cents: number } | null>;
    markPaymentRefunded(orderId: string, refundedCents: number, totalRefundedCents: number, amountCents: number): Promise<void>;
    getById(id: string): Promise<OrderRowLike | null>;
  };
  catalogRepo: { decrementInventory(variantId: string, qty: number): Promise<number> };
  discountsRepo: { incrementUsage(code: string): Promise<void> };
  abandonedCartsRepo: { markConverted(email: string): Promise<void> };
}

type OrderStatusArg = Parameters<WebhookDeps['markPaid']>[1] extends never ? never : 'paid' | 'cancelled' | 'refunded' | 'partially_refunded' | string;

export function buildDefaultWebhookDeps(repos: DefaultWebhookRepos): WebhookDeps {
  const now = () => new Date().toISOString();
  return {
    async getOrderBySessionId(sessionId) {
      return repos.ordersRepo.getBySessionId(sessionId);
    },
    async markPaid(orderId, paymentIntentId) {
      await repos.ordersRepo.setStatus(orderId, 'paid', { paid_at: now() });
      await repos.ordersRepo.addEvent(orderId, 'payment_succeeded', { paymentIntentId });
    },
    async cancelOrder(orderId, reason) {
      await repos.ordersRepo.setStatus(orderId, 'cancelled', { cancelled_at: now() });
      await repos.ordersRepo.addEvent(orderId, 'order_cancelled', { reason });
    },
    decrementInventory: (variantId, qty) => repos.catalogRepo.decrementInventory(variantId, qty),
    incrementDiscountUsage: (code) => repos.discountsRepo.incrementUsage(code),
    markCartConverted: (email) => repos.abandonedCartsRepo.markConverted(email),
    async ensurePaymentSucceeded(orderId, sessionId, paymentIntentId, amountCents) {
      const existing = await repos.ordersRepo.getPaymentByOrderId(orderId);
      if (existing) {
        await repos.ordersRepo.updatePaymentBySession(sessionId, { status: 'succeeded', stripe_payment_intent_id: paymentIntentId });
      } else {
        await repos.ordersRepo.createPayment(orderId, amountCents, 'EUR', sessionId);
        await repos.ordersRepo.updatePaymentBySession(sessionId, { status: 'succeeded', stripe_payment_intent_id: paymentIntentId });
      }
    },
    async handleRefund(paymentIntentId, amountRefundedCents, amountCents) {
      const payment = await repos.ordersRepo.getPaymentByIntentId(paymentIntentId);
      if (!payment) {
        logger.warn('refund_payment_not_found', { paymentIntentId });
        return;
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
    sendEmail: (payload) => sendEmail(payload),
  };
}

export function assertWebhookConfigured(): void {
  // Lazy import avoided: controller checks config().STRIPE_WEBHOOK_SECRET before calling.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw AppError.serviceUnavailable('webhook_not_configured', 'STRIPE_WEBHOOK_SECRET manquant.');
  }
}
