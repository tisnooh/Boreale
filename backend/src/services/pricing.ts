import type { PricedItem, ShippingMethod, TotalsDTO } from '../types/index.js';

/**
 * Pure pricing logic — no I/O. Unit tested in test/pricing.test.ts.
 * All amounts are integer cents. Server-side only: the client never dictates prices.
 */

export interface ShippingOption {
  id: ShippingMethod;
  label: string;
  etaLabel: string;
  priceCents: number;
  /** Free shipping above this subtotal (after discount). null = never free. */
  freeAboveCents: number | null;
}

/** Launch shipping grid (DECISIONS.md D010 — no carrier integrated yet; owner must confirm). */
export const SHIPPING_OPTIONS: Record<ShippingMethod, ShippingOption> = {
  standard: {
    id: 'standard',
    label: 'Livraison standard',
    etaLabel: '48-72 h ouvrées',
    priceCents: 490,
    freeAboveCents: 6900,
  },
  express: {
    id: 'express',
    label: 'Livraison express',
    etaLabel: '24-48 h ouvrées',
    priceCents: 990,
    freeAboveCents: null,
  },
};

export interface DiscountSpec {
  type: 'percentage' | 'fixed';
  value: number; // percentage: 1..100 — fixed: cents
  minSubtotalCents: number;
}

export function subtotalCents(items: PricedItem[]): number {
  return items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
}

export function computeDiscountCents(subtotal: number, discount: DiscountSpec | null | undefined): number {
  if (!discount) return 0;
  if (subtotal < discount.minSubtotalCents) return 0;
  if (discount.type === 'percentage') {
    const pct = Math.min(100, Math.max(0, discount.value));
    return Math.round((subtotal * pct) / 100);
  }
  return Math.min(Math.max(0, discount.value), subtotal);
}

export function computeShippingCents(method: ShippingMethod, subtotalAfterDiscount: number): number {
  const opt = SHIPPING_OPTIONS[method];
  if (opt.freeAboveCents !== null && subtotalAfterDiscount >= opt.freeAboveCents) return 0;
  return opt.priceCents;
}

export interface TotalsBreakdown extends TotalsDTO {
  itemCount: number;
  freeShippingApplied: boolean;
  freeShippingThresholdCents: number | null;
}

export function computeTotals(
  items: PricedItem[],
  discount: DiscountSpec | null | undefined,
  method: ShippingMethod = 'standard',
  currency = 'EUR'
): TotalsBreakdown {
  const subtotal = subtotalCents(items);
  const discountCents = computeDiscountCents(subtotal, discount);
  const afterDiscount = subtotal - discountCents;
  const shippingCents = computeShippingCents(method, afterDiscount);
  const opt = SHIPPING_OPTIONS[method];
  return {
    currency,
    subtotalCents: subtotal,
    discountCents,
    shippingCents,
    totalCents: afterDiscount + shippingCents,
    itemCount: items.reduce((s, it) => s + it.quantity, 0),
    freeShippingApplied: shippingCents === 0 && afterDiscount > 0 && opt.freeAboveCents !== null,
    freeShippingThresholdCents: opt.freeAboveCents,
  };
}

/** Bundle saving vs buying items separately (factual — DECISIONS.md D007/D014). */
export function bundleSavingCents(bundlePriceCents: number, itemsSeparatelyCents: number): number {
  return Math.max(0, itemsSeparatelyCents - bundlePriceCents);
}
