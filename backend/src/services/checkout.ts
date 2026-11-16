import type Stripe from 'stripe';
import { runDurableCheckout, type CheckoutIntentDeps } from './checkout-intents.js';
import type { CheckoutIntent, CheckoutSnapshot } from '../repositories/checkout-intents.js';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { catalogRepo } from '../repositories/catalog.js';
import { discountsRepo } from '../repositories/users.js';
import type { CheckoutInput } from '../validators/checkout.js';
import { computeTotals, type DiscountSpec } from './pricing.js';
import type { DbDiscount, PricedItem, TotalsDTO } from '../types/index.js';

export interface CheckoutDeps {
  intents?: CheckoutIntentDeps;
  getVariantsByIds(ids: string[]): Promise<{ id: string; sku: string; title: string; price_cents: number; is_active: boolean; products: { id: string; name: string; procurement_status?: 'unverified' | 'verified'; is_active: boolean; image_url: string | null } | null; inventory: { quantity: number } | null }[]>;
  findActiveDiscount(code: string): Promise<DbDiscount | null>;
}

export const defaultCheckoutDeps: CheckoutDeps = {
  getVariantsByIds: ids => catalogRepo.getVariantsByIds(ids) as never,
  findActiveDiscount: code => discountsRepo.findActiveByCode(code) as Promise<DbDiscount | null>,
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

async function quoteCheckout(input: CheckoutInput, deps: CheckoutDeps) {
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

  return { priced, totals, discountCode: discountSpec ? input.discountCode!.toUpperCase() : null };
}

function checkoutSnapshot(input: CheckoutInput, priced: PricedItem[], totals: TotalsDTO, discountCode: string | null): CheckoutSnapshot {
  return { items: priced, totals, order: {
    email: input.customer.email.trim().toLowerCase(), currency: totals.currency,
    subtotalCents: totals.subtotalCents, discountCents: totals.discountCents,
    shippingCents: totals.shippingCents, totalCents: totals.totalCents,
    shippingMethod: input.shippingMethod, discountCode,
    shippingAddress: { firstName: input.customer.firstName, lastName: input.customer.lastName,
      phone: input.customer.phone ?? null, ...input.customer.address },
    items: priced.map(p => ({ variant_id: p.variantId, sku: p.sku, product_name: p.productName,
      variant_title: p.variantTitle, unit_price_cents: p.unitPriceCents, quantity: p.quantity,
      total_cents: p.unitPriceCents * p.quantity, image_url: p.imageUrl })),
  } };
}

export function buildIntentStripeParams(intent: CheckoutIntent): Stripe.Checkout.SessionCreateParams {
  const cfg = config();
  const site = cfg.PUBLIC_SITE_URL.replace(/\/+$/, '');
  const { order, items, totals } = intent.snapshot;
  return { mode: 'payment', locale: 'fr', customer_email: order.email,
    line_items: buildStripeLineItems(items, totals, order.discountCode),
    metadata: { orderId: intent.order_id, orderNumber: intent.order_number, checkoutIntentId: intent.id, brand: 'boreale',
      stripeAccountId: cfg.STRIPE_ACCOUNT_ID ?? '', stripeMode: cfg.STRIPE_MODE },
    payment_intent_data: { metadata: { orderId: intent.order_id, checkoutIntentId: intent.id } },
    success_url: site + '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: site + '/checkout/cancel?order=' + encodeURIComponent(intent.order_number),
    billing_address_collection: 'required', allow_promotion_codes: false,
    // Stripe default is 24h; no dynamic timestamp can change retry parameters.
  };
}

export async function createCheckout(
  input: CheckoutInput,
  deps: CheckoutDeps = defaultCheckoutDeps,
  authenticatedUserId: string | null = null
): Promise<CheckoutResult> {
  return runDurableCheckout(input, authenticatedUserId, async () => {
    const { priced, totals, discountCode } = await quoteCheckout(input, deps);
    return checkoutSnapshot(input, priced, totals, discountCode);
  }, buildIntentStripeParams, deps.intents);
}

export const __testing = { buildStripeLineItems };
