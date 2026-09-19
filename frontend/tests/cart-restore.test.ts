import { describe, expect, it } from 'vitest';
import { decodeRestore, encodeRestore, toCartItems, type RestorableVariant } from '@/lib/cart-restore';

describe('encode/decode restore (base64url)', () => {
  it('round-trip fidèle', () => {
    const items = [
      { variantId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 },
      { variantId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 },
    ];
    const encoded = encodeRestore(items);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decodeRestore(encoded)).toEqual(items);
  });

  it('URL-safe même avec des bytes pièges', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ variantId: `v-${i}-????????`, quantity: 3 }));
    const encoded = encodeRestore(items);
    expect(() => new URL(`http://x/cart?restore=${encodeURIComponent(encoded)}`)).not.toThrow();
    expect(decodeRestore(encoded)).toHaveLength(30);
  });

  it('entrées corrompues → [] sans exception', () => {
    expect(decodeRestore(null)).toEqual([]);
    expect(decodeRestore('')).toEqual([]);
    expect(decodeRestore('!!!pas-base64!!!')).toEqual([]);
    expect(decodeRestore('eyJuIjoxfQ')).toEqual([]); // JSON objet, pas tableau
    expect(decodeRestore(encodeRestore([]))).toEqual([]);
  });

  it('filtre les lignes invalides (qty ≤ 0, > 20, types faux)', () => {
    const raw = [
      { variantId: 'a', quantity: 0 },
      { variantId: 'b', quantity: 21 },
      { variantId: 'c', quantity: 2 },
      { variantId: 42, quantity: 1 },
      null,
    ];
    const encoded = encodeRestore(raw as never);
    expect(decodeRestore(encoded)).toEqual([{ variantId: 'c', quantity: 2 }]);
  });

  it('borne à 50 lignes', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ variantId: `id-${i}`, quantity: 1 }));
    expect(decodeRestore(encodeRestore(many))).toHaveLength(50);
  });
});

describe('toCartItems (fusion avec l’état serveur)', () => {
  const variants: RestorableVariant[] = [
    {
      id: 'v1',
      sku: 'S1',
      title: 'S/M · Écru',
      priceCents: 2490,
      inStock: true,
      quantity: 4,
      product: { slug: 'chaussettes-polaires-nuage', name: 'Chaussettes polaires « Nuage »', imageUrl: '/products/x.svg' },
    },
    {
      id: 'v2',
      sku: 'S2',
      title: 'U',
      priceCents: 1290,
      inStock: false, // rupture → écartée
      quantity: 0,
      product: { slug: 'gant-grattoir-polaire', name: 'Gant grattoir « Polaire »', imageUrl: null },
    },
  ];

  it('reprend les prix/stocks SERVEUR, plafonne au stock actuel', () => {
    const restored = toCartItems([{ variantId: 'v1', quantity: 10 }], variants);
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ priceCents: 2490, quantity: 4, maxQuantity: 4, productSlug: 'chaussettes-polaires-nuage' });
  });

  it('écarte ruptures, inconnus et produits désactivés (product=null)', () => {
    const out = toCartItems(
      [
        { variantId: 'v2', quantity: 1 },
        { variantId: 'inconnu', quantity: 1 },
      ],
      variants
    );
    expect(out).toEqual([]);
  });
});
