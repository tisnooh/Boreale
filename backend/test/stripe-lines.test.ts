import { describe, expect, it } from 'vitest';
import { buildStripeLineItems } from '../src/services/checkout.js';
import { computeTotals } from '../src/services/pricing.js';
import type { PricedItem, TotalsDTO } from '../src/types/index.js';

function item(price: number, quantity: number, sku = 'SKU-1'): PricedItem {
  return { variantId: sku, sku, productName: sku, variantTitle: 'Variante', unitPriceCents: price, quantity, imageUrl: null };
}

function assertLines(items: PricedItem[], totals: TotalsDTO) {
  const lines = buildStripeLineItems(items, totals, 'TEST');
  expect(lines.reduce((sum, line) => sum + line.quantity * line.price_data.unit_amount, 0)).toBe(totals.totalCents);
  for (const line of lines) {
    expect(Number.isSafeInteger(line.price_data.unit_amount)).toBe(true);
    expect(line.price_data.unit_amount).toBeGreaterThanOrEqual(0);
    expect(line.quantity).toBeGreaterThan(0);
    expect(line.price_data.currency).toBe('eur');
  }
  expect(lines.filter((line) => line.price_data.product_data.name !== 'Livraison').reduce((sum, line) => sum + line.quantity, 0))
    .toBe(items.reduce((sum, entry) => sum + entry.quantity, 0));
  return lines;
}

describe('Stripe line amounts (pure local payload, not a remote payment)', () => {
  it('preserves original prices and quantities with no discount', () => {
    const items = [item(2490, 2)];
    const lines = assertLines(items, computeTotals(items, null));
    expect(lines[0]!.price_data.unit_amount).toBe(2490);
    expect(lines[0]!.quantity).toBe(2);
  });

  it('allocates one cent exactly across three identical units', () => {
    const items = [item(100, 3)];
    const lines = assertLines(items, computeTotals(items, { type: 'fixed', value: 1, minSubtotalCents: 0 }));
    expect(lines.slice(0, 2).map((line) => [line.quantity, line.price_data.unit_amount])).toEqual([[1, 99], [2, 100]]);
  });

  it('allocates percentage discounts across different prices and keeps delivery unchanged', () => {
    const items = [item(2491, 3, 'A'), item(1293, 2, 'B')];
    const totals = computeTotals(items, { type: 'percentage', value: 17, minSubtotalCents: 0 }, 'express');
    const lines = assertLines(items, totals);
    expect(lines.at(-1)).toMatchObject({ quantity: 1, price_data: { unit_amount: 990, product_data: { name: 'Livraison' } } });
  });

  it('supports a complete product discount while charging delivery', () => {
    const items = [item(999, 2)];
    const lines = assertLines(items, computeTotals(items, { type: 'percentage', value: 100, minSubtotalCents: 0 }));
    expect(lines[0]!.price_data.unit_amount).toBe(0);
  });

  it('conserves exact cents across rounding boundaries and quantities', () => {
    for (let quantity = 1; quantity <= 20; quantity++) {
      const items = [item(101, quantity, 'A'), item(3, 7, 'B')];
      for (const value of [1, 2, 7, 33, 99, 100]) {
        assertLines(items, computeTotals(items, { type: 'percentage', value, minSubtotalCents: 0 }));
      }
    }
  });

  it('rejects inconsistent totals, negative or fractional cents, invalid quantities and currency', () => {
    const items = [item(100, 2)];
    const totals = computeTotals(items, null);
    for (const patch of [{ totalCents: 1 }, { subtotalCents: 201 }, { discountCents: 201 }, { shippingCents: -1 },
      { discountCents: 0.5 }, { totalCents: Number.NaN }, { currency: 'euro' }]) {
      expect(() => buildStripeLineItems(items, { ...totals, ...patch }, null)).toThrow();
    }
    expect(() => buildStripeLineItems([item(-1, 1)], totals, null)).toThrow();
    expect(() => buildStripeLineItems([item(100, 0)], totals, null)).toThrow();
    expect(() => buildStripeLineItems([item(100, 21)], totals, null)).toThrow();
    expect(() => buildStripeLineItems([], totals, null)).toThrow();
  });

  it('rejects a split cart that exceeds Stripe’s 100-line limit', () => {
    const items = Array.from({ length: 50 }, (_, index) => item(10, 2, String(index)));
    expect(() => buildStripeLineItems(items, { currency: 'EUR', subtotalCents: 1000, discountCents: 50, shippingCents: 1, totalCents: 951 }, null)).toThrow();
  });
});
