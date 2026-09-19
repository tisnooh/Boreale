import { describe, expect, it } from 'vitest';
import { formatCents, formatDate, stockLabel, freeShippingProgress } from '@/lib/format';

describe('formatCents', () => {
  it('formate en euros français', () => {
    // Le format exact dépend de l'ICU du runtime : on vérifie les invariants (montant + symbole €)
    const s = formatCents(2490);
    expect(s).toContain('24,90');
    expect(s).toContain('€');
  });
  it('gère 0 et les gros montants', () => {
    expect(formatCents(0)).toContain('0,00');
    expect(formatCents(123456789)).toContain('1');
  });
});

describe('formatDate', () => {
  it('produit une date française lisible', () => {
    const d = formatDate('2026-01-15T10:00:00Z');
    expect(d).toContain('2026');
    expect(d).toContain('janvier');
  });
});

describe('stockLabel', () => {
  it('reflète honnêtement les paliers de stock', () => {
    expect(stockLabel(0)).toBe('Rupture de stock');
    expect(stockLabel(3)).toBe('Plus que 3 en stock');
    expect(stockLabel(6)).toBe('En stock');
    expect(stockLabel(null)).toBe('');
    expect(stockLabel(2, 2)).toBe('Plus que 2 en stock');
  });
});

describe('freeShippingProgress', () => {
  it('borde entre 0 et 1', () => {
    expect(freeShippingProgress(0, 6900)).toBe(0);
    expect(freeShippingProgress(3450, 6900)).toBeCloseTo(0.5);
    expect(freeShippingProgress(10000, 6900)).toBe(1);
  });
});
