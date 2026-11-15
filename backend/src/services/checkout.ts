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
  getVariantsByIds(ids: string[]): Promise<{ id: string; sku: string; title: string; price_cents: number; is_active: boolean; products: { id: string; name: string; procurement_status?: 'unverified' | 'verified'; is_active: boolean; image_url: string | null } | null; inventory: { quantity: number } | null }[]>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  upsertCustomer(input: { email: string; firstName: string; lastName: string; phone?: string | null; userId?: string | null }): Promise<{ id: string }>;
  addAddress(customerId: string, address: CheckoutInput['customer']['address'] & { firstName: string; lastName: string; phone?: string | null }): Promise<void>;
  findActiveDiscount(code: string): Promise<DbDiscount | null>;
  createOrder(input: Parameters<typeof ordersRepo.create>[0]): Promise<{ id: string; number: string }>;
  createPayment(orderId: string, amountCents: number, currency: string, sessionId: string): Promise<void>;
  setSessionId(orderId: string, sessionId: string): Promise<void>;
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
  setSessionId: (orderId, sessionId) => ordersRepo.setSessionId(orderId, sessionId),
  async createStripeSession({ orderNumber, orderId, email, items, totals, discountCode }) {
    const site = config().PUBLIC_SITE_URL.replace(/\/+$/, '');
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      customer_email: email,
      // Net item prices include the server discount; Stripe rejects negative lines.
      line_items: buildStripeLineItems(items, totals, discountCode),
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

export interface StripeCheckoutLineItem {
  quantity: number;
  price_data: { currency: string; unit_amount: number; product_data: { name: string } };
}

/** Exact integer allocation; no remote coupon and no negative Stripe price.
 * API contract: https://docs.stripe.com/api/checkout/sessions/create#line_items
 * Largest remainders allocate cents between items, then split a quantity only
 * when its net total cannot be represented by one integer unit price.
 */
export function buildStripeLineItems(items: PricedItem[], totals: TotalsDTO, discountCode: string | null): StripeCheckoutLineItem[] {
  const invalid = () => AppError.badRequest('invalid_stripe_totals', 'Montants du paiement incohérents.');
  const cents = [totals.subtotalCents, totals.discountCents, totals.shippingCents, totals.totalCents];
  if (!items.length || items.length > 50 || !/^[A-Za-z]{3}$/.test(totals.currency) ||
      cents.some((amount) => !Number.isSafeInteger(amount) || amount < 0) ||
      items.some((item) => !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) throw invalid();
  const gross = items.map((item) => BigInt(item.unitPriceCents) * BigInt(item.quantity));
  const subtotal = gross.reduce((sum, amount) => sum + amount, BigInt(0));
  if (subtotal !== BigInt(totals.subtotalCents) || subtotal <= BigInt(0) ||
      totals.discountCents > totals.subtotalCents ||
      BigInt(totals.totalCents) !== subtotal - BigInt(totals.discountCents) + BigInt(totals.shippingCents) ||
      totals.totalCents <= 0) throw invalid();
  const net = subtotal - BigInt(totals.discountCents);
  const allocations = gross.map((amount, index) => ({
    index, amount: amount * net / subtotal, remainder: amount * net % subtotal,
  }));
  const remaining = Number(net - allocations.reduce((sum, item) => sum + item.amount, BigInt(0)));
  const ranked = [...allocations].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; index < remaining; index++) ranked[index]!.amount += BigInt(1);
  const lines: StripeCheckoutLineItem[] = [];
  for (const allocation of allocations) {
    const item = items[allocation.index]!;
    const unit = Number(allocation.amount / BigInt(item.quantity));
    const extra = Number(allocation.amount % BigInt(item.quantity));
    const name = (item.variantTitle ? `${item.productName} — ${item.variantTitle}` : item.productName) +
      (totals.discountCents > 0 ? ` — remise ${discountCode ?? 'promotionnelle'} incluse` : '');
    const add = (quantity: number, amount: number) => {
      if (quantity > 0) lines.push({ quantity, price_data: {
        currency: totals.currency.toLowerCase(), unit_amount: amount, product_data: { name },
      } });
    };
    add(item.quantity - extra, unit);
    add(extra, unit + 1);
  }
  if (totals.shippingCents > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: totals.currency.toLowerCase(),
        unit_amount: totals.shippingCents,
        product_data: { name: 'Livraison' },
      },
    });
  }
  // Checkout payment mode supports at most 100 line items, including delivery.
  if (lines.length > 100 || lines.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(line.price_data.unit_amount), BigInt(0)) !== BigInt(totals.totalCents)) throw invalid();
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
  deps: CheckoutDeps = defaultCheckoutDeps,
  authenticatedUserId: string | null = null
): Promise<CheckoutResult> {
  // 1. Load variants server-side (never trust client prices)
  const uniqueIds = [...new Set(input.items.map((i) => i.variantId))];
  const variants = await deps.getVariantsByIds(uniqueIds);
  const byId = new Map(variants.map((v) => [v.id, v]));

  const priced: PricedItem[] = [];
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }
  for (const [variantId, quantity] of quantities) {
    const item = { variantId, quantity };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw AppError.unprocessable('invalid_quantity', 'Quantité maximale par variante : 20.');
    }
    const v = byId.get(item.variantId);
    if (!v) throw AppError.unprocessable('variant_not_found', `Variante introuvable (${item.variantId}).`);
    if (!v.is_active || !v.products || !v.products.is_active) {
      throw AppError.conflict('product_unavailable', `« ${v.products?.name ?? 'Produit'} » n’est plus disponible.`);
    }
    if (v.products.procurement_status !== 'verified') {
      throw AppError.conflict('procurement_unverified', 'Approvisionnement non vérifié : ce produit ne peut pas être commandé.');
    }
    const available = v.inventory?.quantity ?? 0;
    if (available < item.quantity) {
      throw AppError.conflict('insufficient_stock', `Stock insuffisant pour « ${v.products.name} — ${v.title} » (restant : ${available}).`, {
        variantId: v.id,
        available,
        requested: item.quantity,
      });
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

  // Validate the exact Stripe payload before creating any customer or order.
  buildStripeLineItems(priced, totals, discountSpec ? input.discountCode!.toUpperCase() : null);

  // 4. Customer + address
  // Seule la session authentifiée établit la propriété ; un email saisi n'est pas une preuve.
  const user = authenticatedUserId ? { id: authenticatedUserId } : null;
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
  await deps.setSessionId(order.id, session.id);
  await deps.createPayment(order.id, totals.totalCents, totals.currency, session.id);

  logger.info('checkout_session_created', { orderId: order.id, orderNumber: order.number, totalCents: totals.totalCents });
  return { url: session.url, orderId: order.id, orderNumber: order.number, totals };
}

/** Exposed for tests — mirrors defaultCheckoutDeps.createStripeSession but with explicit lines. */
export const __testing = { buildStripeLineItems };
