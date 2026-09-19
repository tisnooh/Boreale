import { describe, expect, it } from 'vitest';
import { computeLocalTotals, computeShippingCents } from '@/lib/totals';
import { SHIPPING } from '@/lib/constants';

describe('computeShippingCents', () => {
  it('standard : 4,90 € sous 69 €, offerte au-delà (après remise)', () => {
    expect(computeShippingCents('standard', 6899)).toBe(SHIPPING.standard.priceCents);
    expect(computeShippingCents('standard', 6900)).toBe(0);
  });
  it('express : jamais offerte', () => {
    expect(computeShippingCents('express', 99999)).toBe(SHIPPING.express.priceCents);
  });
});

describe('computeLocalTotals (miroir client du backend)', () => {
  it('cas nominal sans remise', () => {
    const t = computeLocalTotals(4980, 0, 'standard');
    expect(t).toMatchObject({ subtotalCents: 4980, discountCents: 0, shippingCents: 490, totalCents: 5470 });
  });

  it('remise qui fait passer sous le seuil de livraison offerte', () => {
    // 70 € − 10 % = 63 € → livraison due
    const t = computeLocalTotals(7000, 700, 'standard');
    expect(t.shippingCents).toBe(490);
    expect(t.totalCents).toBe(7000 - 700 + 490);
  });

  it('remise > sous-total : total jamais négatif', () => {
    const t = computeLocalTotals(1000, 5000, 'standard');
    expect(t.discountCents).toBe(1000);
    expect(t.totalCents).toBe(490); // 0 + livraison
  });

  it('cohérent avec les règles affichées (seuils constants)', () => {
    expect(SHIPPING.standard.freeAboveCents).toBe(6900);
    expect(SHIPPING.standard.priceCents).toBe(490);
    expect(SHIPPING.express.priceCents).toBe(990);
  });
});
