import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { stripe } from '../lib/stripe.js';
import { catalogRepo } from '../repositories/catalog.js';
import { ordersRepo } from '../repositories/orders.js';
import { discountsRepo, usersRepo } from '../repositories/users.js';
import type { CheckoutInput } from '../validators/checkout.js';
import { computeTotals, type DiscountSpec } from './pricing.js';
import type { DbDiscount, PricedItem, TotalsDTO } from '../types/index.js';

export interface StripeSessionResult {
  id: string;
  url: string | null;
}

export interface CheckoutDeps {
  getVariantsByIds(ids: string[]): Promise<{ id: string; sku: string; title: string; price_cents: number; is_active: boolean; products: { id: string; name: string; is_active: boolean; image_url: string | null } | null; inventory: { quantity: number } | null }[]>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  upsertCustomer(input: { email: string; firstName: string; lastName: string; phone?: string | null; userId?: string | null }): Promise<{ id: string }>;
  addAddress(customerId: string, address: CheckoutInput['customer']['address'] & { firstName: string; lastName: string; phone?: string | null }): Promise<void>;
  findActiveDiscount(code: string): Promise<DbDiscount | null>;
  createOrder(input: Parameters<typeof ordersRepo.create>[0]): Promise<{ id: string; number: string }>;
  createPayment(orderId: string, amountCents: number, currency: string, sessionId: string): Promise<void>;
  createStripeSession(args: {
    orderNumber: string;
    orderId: string;
    email: string;
    items: PricedItem[];
    totals: TotalsDTO;
    discountCode: string | null;
  }): Promise<StripeSessionResult>;
}

export const defaultCheckoutDeps: CheckoutDeps = {
  getVariantsByIds: (ids) => catalogRepo.getVariantsByIds(ids) as never,
  findUserByEmail: async (email) => {
    const u = await usersRepo.findByEmail(email);
    return u ? { id: u.id } : null;
  },
  upsertCustomer: (input) => ordersRepo.upsertCustomer(input),
  addAddress: (customerId, address) => ordersRepo.addAddress(customerId, address),
  findActiveDiscount: (code) => discountsRepo.findActiveByCode(code) as Promise<DbDiscount | null>,
  createOrder: (input) => ordersRepo.create(input) as never,
  createPayment: (orderId, amountCents, currency, sessionId) => ordersRepo.createPayment(orderId, amountCents, currency, sessionId),
  async createStripeSession({ orderNumber, orderId, email, items, totals, discountCode }) {
    const site = config().PUBLIC_SITE_URL.replace(/\/+$/, '');
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      customer_email: email,
      // Discount & shipping are explicit immutable line items computed server-side,
      // so the Stripe total always equals our totals (no client-controlled amounts).
      line_items: buildStripeLineItems(items, totals, discountCode) as never,
      metadata: { orderId, orderNumber, brand: 'boreale' },
      payment_intent_data: { metadata: { orderId, orderNumber } },
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout/cancel?order=${encodeURIComponent(orderNumber)}`,
      billing_address_collection: 'required',
      allow_promotion_codes: false,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes
    });
    return { id: session.id, url: session.url };
  },
};

/** Builds Stripe line items: products + explicit negative discount line + shipping line. */
function buildStripeLineItems(items: PricedItem[], totals: TotalsDTO, discountCode: string | null) {
  const lines = items.map((it) => ({
    quantity: it.quantity,
    price_data: {
      currency: totals.currency.toLowerCase(),
      unit_amount: it.unitPriceCents,
      product_data: { name: it.variantTitle ? `${it.productName} — ${it.variantTitle}` : it.productName },
    },
  }));
  if (totals.discountCents > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: totals.currency.toLowerCase(),
        unit_amount: -totals.discountCents,
        product_data: { name: `Remise ${discountCode ?? 'promotionnelle'}` },
      },
    });
  }
  if (totals.shippingCents > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: totals.currency.toLowerCase(),
        unit_amount: totals.shippingCents,
        product_data: { name: `Livraison ${totals.shippingCents === 0 ? 'offerte' : 'standard/express'}` },
      },
    });
  }
  return lines;
}

export interface CheckoutResult {
  url: string;
  orderId: string;
  orderNumber: string;
  totals: TotalsDTO;
}

export async function createCheckout(
  input: CheckoutInput,
  deps: CheckoutDeps = defaultCheckoutDeps
): Promise<CheckoutResult> {
  // 1. Load variants server-side (never trust client prices)
  const uniqueIds = [...new Set(input.items.map((i) => i.variantId))];
  const variants = await deps.getVariantsByIds(uniqueIds);
  const byId = new Map(variants.map((v) => [v.id, v]));

  const priced: PricedItem[] = [];
  for (const item of input.items) {
    const v = byId.get(item.variantId);
    if (!v) throw AppError.unprocessable('variant_not_found', `Variante introuvable (${item.variantId}).`);
    if (!v.is_active || !v.products || !v.products.is_active) {
      throw AppError.conflict('product_unavailable', `« ${v.products?.name ?? 'Produit'} » n’est plus disponible.`);
    }
    const available = v.inventory?.quantity ?? 0;
    if (available < item.quantity) {
      throw AppError.conflict('insufficient_stock', `Stock insuffisant pour « ${v.products.name} — ${v.title} » (restant : ${available}).`, {
        variantId: v.id,
        available,
        requested: item.quantity,
      });
    }
    // Merge duplicate lines for the same variant
    const existing = priced.find((p) => p.variantId === v.id);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }
    priced.push({
      variantId: v.id,
      sku: v.sku,
      productName: v.products.name,
      variantTitle: v.title,
      unitPriceCents: v.price_cents,
      quantity: item.quantity,
      imageUrl: v.products.image_url,
    });
  }

  // 2. Discount (server-validated)
  let discountSpec: DiscountSpec | null = null;
  if (input.discountCode) {
    const d = await deps.findActiveDiscount(input.discountCode);
    const now = new Date();
    if (
      !d ||
      !d.is_active ||
      (d.starts_at && new Date(d.starts_at) > now) ||
      (d.ends_at && new Date(d.ends_at) < now) ||
      (d.max_uses !== null && d.used_count >= d.max_uses)
    ) {
      throw AppError.unprocessable('discount_invalid', 'Ce code promo est invalide ou expiré.');
    }
    discountSpec = { type: d.type, value: d.value, minSubtotalCents: d.min_subtotal_cents };
    const totalsCheck = computeTotals(priced, discountSpec, input.shippingMethod);
    if (totalsCheck.discountCents === 0) {
      throw AppError.unprocessable(
        'discount_not_applicable',
        `Ce code nécessite un minimum de ${Math.ceil(d.min_subtotal_cents / 100)} € d’achat.`
      );
    }
  }

  // 3. Totals
  const totals = computeTotals(priced, discountSpec, input.shippingMethod);
  if (totals.totalCents <= 0) {
    throw AppError.badRequest('invalid_total', 'Le total de la commande doit être supérieur à 0.');
  }

  // 4. Customer + address
  const user = await deps.findUserByEmail(input.customer.email);
  const customer = await deps.upsertCustomer({
    email: input.customer.email,
    firstName: input.customer.firstName,
    lastName: input.customer.lastName,
    phone: input.customer.phone ?? null,
    userId: user?.id ?? null,
  });
  await deps.addAddress(customer.id, {
    ...input.customer.address,
    firstName: input.customer.firstName,
    lastName: input.customer.lastName,
    phone: input.customer.phone ?? null,
  });

  // 5. Order (pending) + items snapshot
  const order = await deps.createOrder({
    customerId: customer.id,
    userId: user?.id ?? null,
    email: input.customer.email,
    currency: totals.currency,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    shippingCents: totals.shippingCents,
    totalCents: totals.totalCents,
    shippingMethod: input.shippingMethod,
    discountCode: discountSpec ? input.discountCode!.toUpperCase() : null,
    shippingAddress: {
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      phone: input.customer.phone ?? null,
      ...input.customer.address,
    },
    items: priced.map((p) => ({
      variant_id: p.variantId,
      sku: p.sku,
      product_name: p.productName,
      variant_title: p.variantTitle,
      unit_price_cents: p.unitPriceCents,
      quantity: p.quantity,
      total_cents: p.unitPriceCents * p.quantity,
      image_url: p.imageUrl,
    })),
  });

  // 6. Stripe session
  const session = await deps.createStripeSession({
    orderNumber: order.number,
    orderId: order.id,
    email: input.customer.email,
    items: priced,
    totals,
    discountCode: discountSpec ? input.discountCode!.toUpperCase() : null,
  });
  if (!session.url) {
    throw new AppError(502, 'stripe_session_failed', 'Stripe n’a pas retourné d’URL de paiement. Réessayez.');
  }
  await ordersRepo.setSessionId(order.id, session.id).catch((err) => logger.warn('setSessionId failed', err));
  await deps.createPayment(order.id, totals.totalCents, totals.currency, session.id);

  logger.info('checkout_session_created', { orderId: order.id, orderNumber: order.number, totalCents: totals.totalCents });
  return { url: session.url, orderId: order.id, orderNumber: order.number, totals };
}

/** Exposed for tests — mirrors defaultCheckoutDeps.createStripeSession but with explicit lines. */
export const __testing = { buildStripeLineItems };
