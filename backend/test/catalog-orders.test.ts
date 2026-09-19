import { describe, expect, it } from 'vitest';
import { canTransition, statusLabel, toOrderDTO } from '../src/services/orders.js';
import { toProductDTO, matchesQuery, sortProducts } from '../src/services/catalog.js';
import type { ProductWithRelations } from '../src/repositories/catalog.js';
import type { DbOrder } from '../src/types/index.js';

describe('transitions de statut de commande', () => {
  it('suit le cycle de vie nominal', () => {
    expect(canTransition('pending', 'paid')).toBe(true);
    expect(canTransition('paid', 'processing')).toBe(true);
    expect(canTransition('processing', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
  });
  it('interdit les retours en arrière et sauts illogiques', () => {
    expect(canTransition('pending', 'shipped')).toBe(false);
    expect(canTransition('delivered', 'paid')).toBe(false);
    expect(canTransition('cancelled', 'paid')).toBe(false);
    expect(canTransition('refunded', 'processing')).toBe(false);
  });
  it('remboursement possible après paiement/livraison', () => {
    expect(canTransition('paid', 'refunded')).toBe(true);
    expect(canTransition('delivered', 'partially_refunded')).toBe(true);
    expect(canTransition('pending', 'refunded')).toBe(false);
  });
  it('labels français pour tous les statuts', () => {
    for (const s of ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_refunded', 'refunded'] as const) {
      expect(statusLabel(s)).toBeTypeOf('string');
    }
  });
});

describe('toOrderDTO', () => {
  it('mappe les colonnes snake_case en DTO camelCase', () => {
    const row = {
      id: 'o1',
      number: 'BOR-2026-000001',
      email: 'a@b.fr',
      status: 'paid',
      currency: 'EUR',
      subtotal_cents: 1000,
      discount_cents: 100,
      shipping_cents: 490,
      total_cents: 1390,
      shipping_method: 'standard',
      discount_code: 'WELCOME10',
      shipping_address: { firstName: 'A', lastName: 'B', line1: '1 rue', postalCode: '75001', city: 'Paris', country: 'FR' },
      tracking_carrier: 'Colissimo',
      tracking_number: '8R123',
      tracking_url: null,
      placed_at: '2026-01-01T00:00:00Z',
      paid_at: '2026-01-01T00:05:00Z',
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      order_items: [
        { id: 'i1', order_id: 'o1', variant_id: null, sku: 'S1', product_name: 'P1', variant_title: 'U', unit_price_cents: 1000, quantity: 1, total_cents: 1000, image_url: null },
      ],
    } as unknown as DbOrder & { order_items: never };
    const dto = toOrderDTO(row as never);
    expect(dto.totalCents).toBe(1390);
    expect(dto.tracking).toEqual({ carrier: 'Colissimo', number: '8R123', url: null });
    expect(dto.items[0]!.productName).toBe('P1');
  });
});

/* ---------- catalogue ---------- */

function product(slug: string, overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
  return {
    id: slug,
    slug,
    name: slug,
    subtitle: null,
    description: 'desc',
    long_description: null,
    type: 'product',
    is_active: true,
    is_featured: false,
    image_url: null,
    images: [],
    badge: null,
    tags: [],
    bundle_items: [],
    seo_title: null,
    seo_description: null,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    product_categories: [{ categories: { id: 'c1', slug: 'chaleur', name: 'Chaleur', tagline: null, description: null, image_url: null, position: 1, is_active: true } }],
    product_variants: [
      { id: 'v1', product_id: slug, sku: 'S1', title: 'U', options: {}, price_cents: 3000, compare_at_price_cents: null, weight_g: null, is_active: true, position: 0, inventory: { variant_id: 'v1', quantity: 5, low_stock_threshold: 3 } },
      { id: 'v2', product_id: slug, sku: 'S2', title: 'U2', options: {}, price_cents: 2000, compare_at_price_cents: null, weight_g: null, is_active: true, position: 1, inventory: { variant_id: 'v2', quantity: 0, low_stock_threshold: 3 } },
    ],
    ...overrides,
  } as ProductWithRelations;
}

describe('toProductDTO', () => {
  it('prix = variante active la moins chère ; inStock si une variante a du stock', () => {
    const dto = toProductDTO(product('a'));
    expect(dto.priceCents).toBe(2000);
    expect(dto.inStock).toBe(true);
    expect(dto.variantCount).toBe(2);
    expect(dto.categories).toEqual([{ slug: 'chaleur', name: 'Chaleur' }]);
  });
  it('hors stock si toutes les variantes sont à 0', () => {
    const p = product('b');
    p.product_variants = p.product_variants!.map((v: { id: string }) => ({ ...v, inventory: { variant_id: v.id, quantity: 0, low_stock_threshold: 3 } })) as never;
    expect(toProductDTO(p).inStock).toBe(false);
  });
});

describe('matchesQuery / sortProducts', () => {
  const baseQuery = { sort: 'featured', page: 1, limit: 24 } as const;
  it('filtre par catégorie, type et texte', () => {
    const bundle = product('pack-x', { type: 'bundle' });
    expect(matchesQuery(product('a'), { ...baseQuery, category: 'chaleur' })).toBe(true);
    expect(matchesQuery(product('a'), { ...baseQuery, category: 'auto-hiver' })).toBe(false);
    expect(matchesQuery(bundle, { ...baseQuery, type: 'bundle' })).toBe(true);
    expect(matchesQuery(product('a'), { ...baseQuery, q: 'DESC' })).toBe(true);
  });
  it('trie par prix croissant/décroissant', () => {
    const rows = [product('cher'), product('pas-cher')];
    rows[0]!.product_variants = [{ id: 'v', product_id: 'cher', sku: 'SC', title: 'U', options: {}, price_cents: 9000, compare_at_price_cents: null, weight_g: null, is_active: true, position: 0, inventory: null }] as never;
    const asc = sortProducts(rows, 'price_asc').map((p) => p.slug);
    expect(asc).toEqual(['pas-cher', 'cher']);
    expect(sortProducts(rows, 'price_desc').map((p) => p.slug)).toEqual(['cher', 'pas-cher']);
  });
});
