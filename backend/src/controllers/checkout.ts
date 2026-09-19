import type { Request, Response } from 'express';
import { config, features } from '../config.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { stripe } from '../lib/stripe.js';
import { ordersRepo } from '../repositories/orders.js';
import { discountsRepo } from '../repositories/users.js';
import { abandonedCartsRepo } from '../repositories/misc.js';
import { createCheckout } from '../services/checkout.js';
import { computeDiscountCents, type DiscountSpec } from '../services/pricing.js';
import { toOrderDTO } from '../services/orders.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { buildDefaultWebhookDeps, handleWebhookEvent } from '../services/webhooks.js';
import { catalogRepo } from '../repositories/catalog.js';

export const checkoutController = {
  /** POST /api/stripe/checkout — creates a pending order + Stripe Checkout Session. */
  createCheckout: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const result = await createCheckout(req.body);
    // If a logged-in user checks out, remember their cart may convert: mark abandoned carts
    res.status(201).json({
      data: { url: result.url, orderId: result.orderId, orderNumber: result.orderNumber, totals: result.totals },
    });
  }),

  /** GET /api/stripe/session/:id — success-page verification (no secrets exposed). */
  getSession: asyncHandler(async (req: Request, res: Response) => {
    const session = await stripe().checkout.sessions.retrieve(req.params.id!);
    const meta = session.metadata ?? {};
    res.json({
      data: {
        paymentStatus: session.payment_status,
        status: session.status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
        orderNumber: meta.orderNumber ?? null,
        orderId: meta.orderId ?? null,
      },
    });
  }),

  /** POST /api/discounts/validate — live feedback in the cart. */
  validateDiscount: asyncHandler(async (req: Request, res: Response) => {
    const { code, subtotalCents } = req.body as { code: string; subtotalCents: number };
    const d = await discountsRepo.findActiveByCode(code);
    const now = new Date();
    const invalid = (message: string) => res.json({ data: { valid: false, discountCents: 0, message } });
    if (!d || !d.is_active) return invalid('Code invalide ou expiré.');
    if (d.starts_at && new Date(d.starts_at) > now) return invalid('Ce code n’est pas encore actif.');
    if (d.ends_at && new Date(d.ends_at) < now) return invalid('Ce code a expiré.');
    if (d.max_uses !== null && d.used_count >= d.max_uses) return invalid('Ce code a atteint sa limite d’utilisation.');
    const spec: DiscountSpec = { type: d.type, value: d.value, minSubtotalCents: d.min_subtotal_cents };
    const discountCents = computeDiscountCents(subtotalCents, spec);
    if (discountCents === 0) {
      return invalid(`Minimum d’achat : ${(spec.minSubtotalCents / 100).toFixed(2)} €.`);
    }
    res.json({
      data: {
        valid: true,
        discountCents,
        message: d.description ?? 'Code appliqué.',
      },
    });
  }),

  /** POST /api/carts/abandoned — called by the checkout page when an email is captured. */
  registerAbandonedCart: asyncHandler(async (req: Request, res: Response) => {
    const { email, items } = req.body as { email: string; items: { variantId: string; quantity: number }[] };
    await abandonedCartsRepo.upsertOpen(email, items);
    res.status(202).json({ ok: true });
  }),

  /** POST /api/webhooks/stripe — raw body, signature verified here. */
  stripeWebhook: asyncHandler(async (req: Request, res: Response) => {
    if (!features.stripeWebhook()) {
      throw AppError.serviceUnavailable('webhook_not_configured', 'STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY manquants.');
    }
    const signature = req.headers['stripe-signature'];
    if (!signature) throw AppError.badRequest('missing_signature', 'Header stripe-signature absent.');
    let event;
    try {
      event = await stripe().webhooks.constructEventAsync(req.body as Buffer, signature as string, config().STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      logger.warn('webhook_signature_invalid', { err: err instanceof Error ? err.message : String(err) });
      throw AppError.badRequest('invalid_signature', 'Signature de webhook invalide.');
    }
    const deps = buildDefaultWebhookDeps({
      ordersRepo: ordersRepo as never,
      catalogRepo: catalogRepo as never,
      discountsRepo: discountsRepo as never,
      abandonedCartsRepo: abandonedCartsRepo as never,
    });
    await handleWebhookEvent(event as never, deps);
    res.json({ received: true });
  }),
};

export const ordersController = {
  /** GET /api/orders/lookup?number=&email= — guest tracking (both fields required). */
  lookup: asyncHandler(async (req: Request, res: Response) => {
    const { number, email } = req.query as { number: string; email: string };
    const order = await ordersRepo.getByNumberAndEmail(number, email);
    if (!order) throw AppError.notFound('order_not_found', 'Aucune commande ne correspond à ce numéro et cet email.');
    res.json({ data: toOrderDTO(order) });
  }),

  /** GET /api/orders/:id — owner or admin only. */
  getById: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const isAdmin = Boolean(req.admin);
    const isOwner = req.user && (order.user_id === req.user.sub || order.email === req.user.email);
    if (!isAdmin && !isOwner) throw AppError.forbidden('not_your_order', 'Cette commande ne vous appartient pas.');
    res.json({ data: toOrderDTO(order) });
  }),

  /** GET /api/me/orders — orders of the authenticated user. */
  myOrders: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const orders = await ordersRepo.listByUserId(req.user!.sub);
    // Also include guest orders placed with the same email before account creation
    const byEmail = await ordersRepo.listByEmail(req.user!.email);
    const seen = new Set(orders.map((o) => o.id));
    const merged = [...orders, ...byEmail.filter((o) => !seen.has(o.id))];
    merged.sort((a, b) => b.placed_at.localeCompare(a.placed_at));
    res.json({ data: merged.map(toOrderDTO) });
  }),
};
