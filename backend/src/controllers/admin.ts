import { orderCapabilities, REFUND_UNAVAILABLE, NOTIFICATIONS_UNAVAILABLE } from '../services/admin-orders.js';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { catalogRepo } from '../repositories/catalog.js';
import { ordersRepo } from '../repositories/orders.js';
import { discountsRepo } from '../repositories/users.js';
import { newsletterRepo, settingsRepo, contactRepo } from '../repositories/misc.js';
import { toOrderDTO, toOrderDTO as mapOrder } from '../services/orders.js';
import { emailTemplates, sendEmail } from '../services/email.js';
import { getStatsOverview } from '../services/stats.js';
import { settingsService } from '../services/settings.js';
import type { ProductUpsertInput } from '../validators/catalog.js';

/* ---------- products ---------- */

async function upsertProduct(body: ProductUpsertInput, existingId?: string) {
  const existing = existingId ? await catalogRepo.adminGetProductById(existingId) : null;
  if (existingId && !existing) throw AppError.notFound('product_not_found', 'Produit introuvable.');
  if (existing?.source_candidate_key != null) throw sourcedDraftError(existing.source_candidate_key);
  if ((body.isActive || body.variants.some((v) => v.isActive)) && existing?.procurement_status !== 'verified') {
    throw AppError.conflict('procurement_unverified', 'Vérifiez l’approvisionnement avant toute activation du produit ou de ses variantes.');
  }
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
    } else if (!v.id) {
      await catalogRepo.adminSetInventory(saved.id, 0, v.lowStockThreshold ?? 5);
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

function sourcedDraftError(key: string) {
  return AppError.conflict('sourced_draft_readonly', 'Ce brouillon se modifie dans le dossier sourcing privé.', { href: `/admin/sourcing/${encodeURIComponent(key)}` });
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
    if (existing.source_candidate_key != null) throw sourcedDraftError(existing.source_candidate_key);
    if (req.query.hard === '1') {
      await catalogRepo.adminDeleteProduct(existing.id);
    } else {
      await catalogRepo.adminUpdateProduct(existing.id, { is_active: false });
    }
    res.json({ ok: true });
  }),

  /* ---------- orders ---------- */

  listOrders: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { page, limit, q, status, fulfillmentStatus } = req.query as unknown as { page: number; limit: number; q?: string; status?: string; fulfillmentStatus?: string };
    const { rows, total } = await ordersRepo.adminList({ page, limit, q, status, fulfillmentStatus });
    res.json({ data: rows.map(mapOrder), page, limit, total });
  }),

  getOrder: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const events = await ordersRepo.listEvents(order.id);
    const payment = await ordersRepo.getPaymentByOrderId(order.id);
    const { incidents, notifications } = await ordersRepo.getOperations(order.id);
    res.json({ data: { ...toOrderDTO(order), events, payment, incidents, notifications, capabilities: orderCapabilities(order) } });
  }),

  setOrderStatus: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const order = await ordersRepo.getById(req.params.id!);
    if (!order) throw AppError.notFound('order_not_found', 'Commande introuvable.');
    const { status, expectedStatus, notify, ...tracking } = req.body;
    if (notify) throw AppError.serviceUnavailable('notifications_unavailable', NOTIFICATIONS_UNAVAILABLE);
    if (['paid', 'refunded', 'partially_refunded'].includes(status)) throw AppError.conflict('provider_confirmation_required', 'Le paiement doit être confirmé par le prestataire.');
    if (order.status !== expectedStatus) throw AppError.conflict('order_state_changed', 'La commande a changé ; rechargez-la.');
    if (status === 'cancelled' && (order.status !== 'pending' || order.paid_at)) throw AppError.conflict('paid_cancellation_requires_review', 'Une commande encaissée nécessite un traitement contrôlé.');
    if (['processing', 'shipped', 'delivered'].includes(status) && order.fulfillment_status !== 'ready') throw AppError.conflict('fulfillment_blocked', 'Traitez l’incident de cette commande avant sa préparation.');
    if (!orderCapabilities(order).allowedStatuses.includes(status)) throw AppError.conflict('invalid_transition', 'Cette transition n’est pas disponible.');
    if (status === 'shipped' && (!(tracking.trackingCarrier ?? order.tracking_carrier)?.trim() || !(tracking.trackingNumber ?? order.tracking_number)?.trim())) throw AppError.conflict('tracking_required', 'Transporteur et numéro de suivi requis.');
    const updated = await ordersRepo.adminOperation(order.id, { action: 'advance', expectedStatus, status, tracking, actor: req.admin!.email });
    res.json({ data: toOrderDTO(updated) });
  }),

  setOrderTracking: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { expectedStatus, expectedTracking, ...tracking } = req.body;
    const updated = await ordersRepo.adminOperation(req.params.id!, { action: 'tracking', expectedStatus, expectedTracking, tracking, actor: req.admin!.email });
    res.json({ data: toOrderDTO(updated) });
  }),

  addOrderNote: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const updated = await ordersRepo.adminOperation(req.params.id!, { action: 'note', note: req.body.note, actor: req.admin!.email });
    res.json({ data: toOrderDTO(updated) });
  }),

  refundOrder: asyncHandler(async (_req: AuthedRequest, _res: Response) => {
    throw AppError.serviceUnavailable('refund_unavailable', REFUND_UNAVAILABLE);
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
