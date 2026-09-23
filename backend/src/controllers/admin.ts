import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { stripe } from '../lib/stripe.js';
import { catalogRepo } from '../repositories/catalog.js';
import { ordersRepo } from '../repositories/orders.js';
import { discountsRepo } from '../repositories/users.js';
import { newsletterRepo, settingsRepo, contactRepo } from '../repositories/misc.js';
import { toOrderDTO, canTransition, toOrderDTO as mapOrder } from '../services/orders.js';
import { emailTemplates, sendEmail } from '../services/email.js';
import { getStatsOverview } from '../services/stats.js';
import { settingsService } from '../services/settings.js';
import type { ProductUpsertInput } from '../validators/catalog.js';
import type { OrderStatus } from '../types/index.js';

/* ---------- products ---------- */

async function upsertProduct(body: ProductUpsertInput, existingId?: string) {
  const productRow = {
    slug: body.slug,
    name: body.name,
    subtitle: body.subtitle ?? null,
    description: body.description,
    long_description: body.longDescription ?? null,
    type: body.type,
    is_active: body.isActive,
    is_featured: body.isFeatured,
    image_url: body.imageUrl ?? null,
    images: body.images,
    badge: body.badge ?? null,
    tags: body.tags,
    bundle_items: body.bundleItems,
    seo_title: body.seoTitle ?? null,
    seo_description: body.seoDescription ?? null,
    position: body.position,
  };

  const product = existingId
    ? await catalogRepo.adminUpdateProduct(existingId, productRow)
    : await catalogRepo.adminInsertProduct(productRow);

  await catalogRepo.adminReplaceCategories(product.id, body.categories);

  // Upsert variants; variants missing from payload are deactivated (never hard-deleted:
  // order_items reference them).
  const kept = new Set<string>();
  for (const v of body.variants) {
    const row = {
      sku: v.sku.toUpperCase(),
      title: v.title,
      options: v.options,
      price_cents: v.priceCents,
      compare_at_price_cents: v.compareAtPriceCents ?? null,
      weight_g: v.weightG ?? null,
      is_active: v.isActive,
      position: v.position,
    };
    const saved = await catalogRepo.adminUpsertVariant(product.id, v.id ? { id: v.id, ...row } : row);
    kept.add(saved.id);
    if (v.stock !== undefined) {
      await catalogRepo.adminSetInventory(saved.id, v.stock, v.lowStockThreshold);
    } else {
      // Ensure an inventory row exists for new variants
      await catalogRepo.adminSetInventory(saved.id, 0, v.lowStockThreshold ?? 5).catch(() => undefined);
      if (!existingId) continue;
    }
  }
  if (existingId) {
    const current = await catalogRepo.adminGetProductById(existingId);
    for (const v of current?.product_variants ?? []) {
      if (!kept.has(v.id)) await catalogRepo.adminUpsertVariant(product.id, { id: v.id, is_active: false } as never);
    }
  }
  return product;
}

export const adminController = {
  listProducts: asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const rows = await catalogRepo.adminListProducts();
    res.json({ data: rows.map((r) => ({ ...r })) });
  }),

  createProduct: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const product = await upsertProduct(req.body as ProductUpsertInput);
    res.status(201).json({ data: product });
  }),

  updateProduct: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const existing = await catalogRepo.adminGetProductById(req.params.id!);
    if (!existing) throw AppError.notFound('product_not_found', 'Produit introuvable.');
    const product = await upsertProduct(req.body as ProductUpsertInput, existing.id);
    res.json({ data: product });
  }),

  deleteProduct: asyncHandler(async (req: AuthedRequest, res: Response) => {
    // Soft delete by default (catalog integrity), hard delete on ?hard=1 for drafts
    const existing = await catalogRepo.adminGetProductById(req.params.id!);
    if (!existing) throw AppError.notFound('product_not_found', 'Produit introuvable.');
    if (req.query.hard === '1') {
      await catalogRepo.adminDeleteProduct(existing.id);
    } else {
      await catalogRepo.adminUpdateProduct(existing.id, { is_active: false });
    }
    res.json({ ok: true });
  }),

  /* ---------- orders ---------- */

  listOrders: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { page, limit, q, status } = req.query as unknown as { page: number; limit: number; q?: string; status?: string };
    const { rows, total } = await ordersRepo.adminList({ page, limit, q, status });
    res.json({ data: rows.map(mapOrder), page, limit, total });
  }),

  getOrder: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const events = await ordersRepo.listEvents(order.id);
    const payment = await ordersRepo.getPaymentByOrderId(order.id);
    res.json({ data: { ...toOrderDTO(order), events, payment } });
  }),

  setOrderStatus: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const { status, trackingCarrier, trackingNumber, trackingUrl, notify } = req.body as {
      status: OrderStatus;
      trackingCarrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      notify?: boolean;
    };
    if (!canTransition(order.status, status)) {
      throw AppError.conflict('invalid_transition', `Transition impossible : ${order.status} → ${status}.`);
    }
    const extra: Record<string, unknown> = {};
    if (trackingCarrier !== undefined) extra.tracking_carrier = trackingCarrier;
    if (trackingNumber !== undefined) extra.tracking_number = trackingNumber;
    if (trackingUrl !== undefined) extra.tracking_url = trackingUrl;
    if (status === 'shipped') extra.shipped_at = new Date().toISOString();
    if (status === 'delivered') extra.delivered_at = new Date().toISOString();
    if (status === 'cancelled') extra.cancelled_at = new Date().toISOString();
    if (status === 'paid' && !order.paid_at) extra.paid_at = new Date().toISOString();

    const updated = await ordersRepo.setStatus(order.id, status, extra as never);
    await ordersRepo.addEvent(order.id, `status_${status}`, { from: order.status, by: req.admin?.email ?? 'admin' });

    // Restock when a PAID order is cancelled
    if (status === 'cancelled' && order.paid_at) {
      for (const item of order.order_items ?? []) {
        if (item.variant_id) {
          await catalogRepo.restoreInventory(item.variant_id, item.quantity).catch((e) => logger.warn('restock_failed', e));
        }
      }
    }

    if (notify && status === 'shipped') {
      const dto = { ...toOrderDTO({ ...order, ...updated, order_items: order.order_items } as never) };
      await sendEmail(emailTemplates.shipping(dto)).catch(() => undefined);
    }
    res.json({ data: toOrderDTO({ ...updated, order_items: order.order_items } as never) });
  }),

  refundOrder: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const payment = await ordersRepo.getPaymentByOrderId(order.id);
    if (!payment || !payment.stripe_payment_intent_id) {
      throw AppError.conflict('no_payment', 'Aucun paiement Stripe réussi sur cette commande.');
    }
    const remaining = payment.amount_cents - (payment.refunded_cents ?? 0);
    if (remaining <= 0) throw AppError.conflict('already_refunded', 'Cette commande est déjà intégralement remboursée.');
    const requested = (req.body as { amountCents?: number }).amountCents;
    const amount = requested === undefined ? remaining : Math.min(requested, remaining);
    if (amount <= 0) throw AppError.badRequest('invalid_amount', 'Montant de remboursement invalide.');

    const refund = await stripe().refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount,
      reason: 'requested_by_customer',
      metadata: { orderId: order.id, orderNumber: order.number, by: req.admin?.email ?? 'admin' },
    });
    await ordersRepo.addEvent(order.id, amount >= remaining ? 'refund_full_requested' : 'refund_partial_requested', {
      amountCents: amount,
      stripeRefundId: refund.id,
      by: req.admin?.email ?? 'admin',
    });
    // Order/payment statuses + customer email are updated by the `charge.refunded`
    // webhook (single source of truth). Requires STRIPE_WEBHOOK_SECRET configured.
    res.json({ data: { stripeRefundId: refund.id, amountCents: amount, status: refund.status } });
  }),

  /* ---------- customers ---------- */

  listCustomers: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    const { rows, total } = await ordersRepo.adminListCustomers({ page, limit, q });
    res.json({ data: rows, page, limit, total });
  }),

  /* ---------- discounts ---------- */

  listDiscounts: asyncHandler(async (_req: AuthedRequest, res: Response) => {
    res.json({ data: await discountsRepo.adminList() });
  }),

  createDiscount: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const b = req.body as Record<string, unknown>;
    const row = {
      code: b.code,
      type: b.type,
      value: b.value,
      min_subtotal_cents: b.minSubtotalCents ?? 0,
      max_uses: b.maxUses ?? null,
      starts_at: b.startsAt ?? null,
      ends_at: b.endsAt ?? null,
      is_active: b.isActive ?? true,
      description: b.description ?? null,
    };
    res.status(201).json({ data: await discountsRepo.adminUpsert(row) });
  }),

  updateDiscount: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const b = req.body as Record<string, unknown>;
    const row: Record<string, unknown> = {};
    const map: Record<string, string> = {
      code: 'code', type: 'type', value: 'value', minSubtotalCents: 'min_subtotal_cents',
      maxUses: 'max_uses', startsAt: 'starts_at', endsAt: 'ends_at', isActive: 'is_active', description: 'description',
    };
    for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) row[col] = b[k];
    res.json({ data: await discountsRepo.adminUpsert(row, req.params.id!) });
  }),

  deleteDiscount: asyncHandler(async (req: AuthedRequest, res: Response) => {
    await discountsRepo.adminDelete(req.params.id!);
    res.json({ ok: true });
  }),

  /* ---------- newsletter ---------- */

  listSubscribers: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { page, limit, q, status } = req.query as unknown as { page: number; limit: number; q?: string; status?: string };
    const { rows, total } = await newsletterRepo.listSubscribers({ page, limit, q, status });
    res.json({ data: rows, page, limit, total });
  }),

  sendCampaign: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { subject, html, limit } = req.body as { subject: string; html: string; limit: number };
    const emails = await newsletterRepo.listSubscribedEmails(limit);
    if (emails.length === 0) throw AppError.conflict('no_recipients', 'Aucun abonné à qui envoyer.');
    let sentCount = 0;
    let failedCount = 0;
    for (const email of emails) {
      const result = await sendEmail(emailTemplates.newsletterCampaign(email, subject, html));
      if (result.delivered) sentCount++;
      else failedCount++;
    }
    await newsletterRepo.createCampaign({ subject, bodyHtml: html, sentCount, failedCount, status: failedCount === 0 ? 'sent' : 'partial' });
    res.json({ data: { recipients: emails.length, sentCount, failedCount } });
  }),

  /* ---------- contact messages ---------- */

  listMessages: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const { rows, total } = await contactRepo.list({ page, limit });
    res.json({ data: rows, page, limit, total });
  }),

  markMessageHandled: asyncHandler(async (req: AuthedRequest, res: Response) => {
    await contactRepo.markHandled(req.params.id!);
    res.json({ ok: true });
  }),

  /* ---------- settings & stats ---------- */

  getHomepageSettings: asyncHandler(async (_req: AuthedRequest, res: Response) => {
    res.json({ data: await settingsService.getHomepage() });
  }),

  setHomepageSettings: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const data = await settingsService.setHomepage(req.body.value as never);
    res.json({ data });
  }),

  getSetting: asyncHandler(async (req: AuthedRequest, res: Response) => {
    res.json({ data: await settingsRepo.get(req.params.key!) });
  }),

  /** Écriture settings par clé — whitelist explicite (homepages saisonnières comprises). */
  setSetting: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const ALLOWED = ['homepage', 'homepage-summer'];
    const key = req.params.key!;
    if (!ALLOWED.includes(key)) {
      throw AppError.badRequest('settings_key_not_allowed', `Clé de réglage non autorisée : ${key}.`);
    }
    await settingsRepo.set(key, (req.body as { value: unknown }).value);
    res.json({ data: await settingsRepo.get(key) });
  }),

  stats: asyncHandler(async (_req: AuthedRequest, res: Response) => {
    res.json({ data: await getStatsOverview() });
  }),
};
