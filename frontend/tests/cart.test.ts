import { describe, expect, it } from 'vitest';
import {
  addToCart,
  cartCount,
  cartSubtotal,
  deserializeCart,
  removeFromCart,
  serializeCart,
  updateQuantity,
  type CartItem,
} from '@/lib/cart-logic';
import type { VariantDTO } from '@/lib/types';

const product = { slug: 'plaid-sherpa-nid', name: 'Plaid sherpa « Nid »', imageUrl: '/products/plaid-sherpa-nid.svg' };

const variant = (id: string, priceCents: number, quantity: number | null = 10): VariantDTO => ({
  id,
  sku: `SKU-${id}`,
  title: 'Écru',
  options: { couleur: 'Écru' },
  priceCents,
  compareAtPriceCents: null,
  inStock: (quantity ?? 0) > 0,
  quantity,
  lowStock: false,
});

describe('addToCart', () => {
  it('ajoute un article avec son prix (copié de la variante)', () => {
    const cart = addToCart([], product, variant('v1', 5990), 1);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ variantId: 'v1', priceCents: 5990, quantity: 1 });
  });

  it('fusionne les doublons et respecte le stock disponible', () => {
    let cart = addToCart([], product, variant('v1', 5990, 3), 2);
    cart = addToCart(cart, product, variant('v1', 5990, 3), 2);
    expect(cart).toHaveLength(1);
    expect(cart[0]!.quantity).toBe(3); // plafonné au stock connu
  });

  it('plafonne à 20 par article', () => {
    const cart = addToCart([], product, variant('v1', 100, 100), 25);
    expect(cart[0]!.quantity).toBeLessThanOrEqual(20);
  });
});

describe('updateQuantity / removeFromCart', () => {
  const base: CartItem[] = [{ variantId: 'v1', productSlug: product.slug, name: product.name, variantTitle: 'Écru', priceCents: 5990, quantity: 2, imageUrl: null, maxQuantity: 10 }];

  it('met à jour la quantité', () => {
    expect(updateQuantity(base, 'v1', 5)[0]!.quantity).toBe(5);
  });
  it('quantité 0 → suppression', () => {
    expect(updateQuantity(base, 'v1', 0)).toHaveLength(0);
  });
  it('retire un article', () => {
    expect(removeFromCart(base, 'v1')).toHaveLength(0);
    expect(removeFromCart(base, 'inconnu')).toHaveLength(1);
  });
});

describe('totaux', () => {
  const cart: CartItem[] = [
    { variantId: 'v1', productSlug: 'a', name: 'A', variantTitle: 'u', priceCents: 2490, quantity: 2, imageUrl: null, maxQuantity: 10 },
    { variantId: 'v2', productSlug: 'b', name: 'B', variantTitle: 'u', priceCents: 1290, quantity: 1, imageUrl: null, maxQuantity: 10 },
  ];
  it('count = somme des quantités, subtotal = somme des lignes', () => {
    expect(cartCount(cart)).toBe(3);
    expect(cartSubtotal(cart)).toBe(6270);
  });
});

describe('persistance localStorage', () => {
  it('round-trip serialization', () => {
    const cart = addToCart([], product, variant('v1', 5990), 1);
    expect(deserializeCart(serializeCart(cart))).toEqual(cart);
  });
  it('données corrompues → panier vide (jamais d’exception)', () => {
    expect(deserializeCart(null)).toEqual([]);
    expect(deserializeCart('{pas-du-json')).toEqual([]);
    expect(deserializeCart('{"a":1}')).toEqual([]);
    expect(deserializeCart('[{"variantId":"v","priceCents":100,"quantity":2}]')).toHaveLength(1);
    expect(deserializeCart('[{"variantId":"v","priceCents":100,"quantity":0}]')).toHaveLength(0);
  });
});
