/** Calculs de totaux côté client — miroir exact du backend (services/pricing.ts).
 *  Le serveur reste la source de vérité au checkout ; ceci sert à l'affichage. */

import { SHIPPING } from './constants';
import type { ShippingMethod } from './types';

export interface DiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  discountCents: number;
}

export function computeShippingCents(method: ShippingMethod, subtotalAfterDiscount: number): number {
  const opt = SHIPPING[method];
  if (opt.freeAboveCents !== null && subtotalAfterDiscount >= opt.freeAboveCents) return 0;
  return opt.priceCents;
}

export function computeLocalTotals(subtotalCents: number, discountCents: number, method: ShippingMethod) {
  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const shippingCents = computeShippingCents(method, afterDiscount);
  return {
    subtotalCents,
    discountCents: Math.min(discountCents, subtotalCents),
    shippingCents,
    totalCents: afterDiscount + shippingCents,
  };
}
