import { describe, expect, it } from 'vitest';
import {
  SHIPPING_OPTIONS,
  bundleSavingCents,
  computeDiscountCents,
  computeShippingCents,
  computeTotals,
} from '../src/services/pricing.js';
import type { PricedItem } from '../src/types/index.js';

const item = (unitPriceCents: number, quantity = 1): PricedItem => ({
  variantId: 'v1',
  sku: 'SKU',
  productName: 'Produit',
  variantTitle: 'Variante',
  unitPriceCents,
  quantity,
  imageUrl: null,
});

describe('computeTotals', () => {
  it('additionne les articles et applique la livraison standard', () => {
    const t = computeTotals([item(2490, 2), item(1290)], null, 'standard');
    expect(t.subtotalCents).toBe(6270);
    expect(t.shippingCents).toBe(SHIPPING_OPTIONS.standard.priceCents); // < 69 €
    expect(t.totalCents).toBe(6270 + 490);
    expect(t.itemCount).toBe(3);
  });

  it('offre la livraison standard dès 69 € (après remise)', () => {
    const t = computeTotals([item(7000)], null, 'standard');
    expect(t.shippingCents).toBe(0);
    expect(t.freeShippingApplied).toBe(true);
    // 65 € + 10 % = 58,50 € après remise → sous le seuil, livraison due
    const t2 = computeTotals([item(6500)], { type: 'percentage', value: 10, minSubtotalCents: 0 }, 'standard');
    expect(t2.discountCents).toBe(650);
    expect(t2.shippingCents).toBe(490);
    expect(t2.freeShippingApplied).toBe(false);
  });

  it('la livraison express n’est jamais offerte', () => {
    expect(computeShippingCents('express', 100_000)).toBe(990);
  });

  it('remise percentage arrondie au centime', () => {
    expect(computeDiscountCents(3333, { type: 'percentage', value: 10, minSubtotalCents: 0 })).toBe(333);
    expect(computeDiscountCents(2490, { type: 'percentage', value: 15, minSubtotalCents: 0 })).toBe(374); // 373.5 → 374
  });

  it('remise fixe plafonnée au sous-total', () => {
    expect(computeDiscountCents(1000, { type: 'fixed', value: 5000, minSubtotalCents: 0 })).toBe(1000);
    const t = computeTotals([item(1000)], { type: 'fixed', value: 5000, minSubtotalCents: 0 }, 'standard');
    // sous-total entièrement remisé → livraison due (pas de "livraison offerte" sur total 0)
    expect(t.discountCents).toBe(1000);
    expect(t.shippingCents).toBe(490);
    expect(t.totalCents).toBe(490);
  });

  it('min_subtotal non atteint → aucune remise', () => {
    expect(computeDiscountCents(1500, { type: 'percentage', value: 10, minSubtotalCents: 2000 })).toBe(0);
  });

  it('le total ne peut jamais être négatif', () => {
    const t = computeTotals([item(100)], { type: 'fixed', value: 100000, minSubtotalCents: 0 }, 'standard');
    expect(t.totalCents).toBeGreaterThanOrEqual(0);
  });
});

describe('bundleSavingCents', () => {
  it('calcule l’économie réelle d’un bundle', () => {
    // Pack Cocooning : 59,90 + 24,90 + 24,90 = 109,70 → 94,90
    expect(bundleSavingCents(9490, 10970)).toBe(1480);
  });
  it('jamais négative', () => {
    expect(bundleSavingCents(12000, 10000)).toBe(0);
  });
});
