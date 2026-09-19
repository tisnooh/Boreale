/** Logique panier pure — testée dans tests/cart.test.ts. */

import type { VariantDTO } from './types';

export interface CartItem {
  variantId: string;
  productSlug: string;
  name: string;
  variantTitle: string;
  priceCents: number;
  quantity: number;
  imageUrl: string | null;
  maxQuantity: number; // stock connu au moment de l'ajout (le serveur revérifie au checkout)
}

export const MAX_PER_ITEM = 20;

export function addToCart(cart: CartItem[], product: { slug: string; name: string; imageUrl: string | null }, variant: VariantDTO, quantity = 1): CartItem[] {
  const qty = Math.min(quantity, MAX_PER_ITEM);
  const existing = cart.find((i) => i.variantId === variant.id);
  if (existing) {
    const cap = Math.min(MAX_PER_ITEM, variant.quantity ?? MAX_PER_ITEM);
    return cart.map((i) =>
      i.variantId === variant.id ? { ...i, quantity: Math.min(i.quantity + qty, cap), maxQuantity: variant.quantity ?? i.maxQuantity } : i
    );
  }
  return [
    ...cart,
    {
      variantId: variant.id,
      productSlug: product.slug,
      name: product.name,
      variantTitle: variant.title,
      priceCents: variant.priceCents,
      quantity: Math.min(qty, Math.max(1, variant.quantity ?? qty)),
      imageUrl: product.imageUrl,
      maxQuantity: variant.quantity ?? MAX_PER_ITEM,
    },
  ];
}

export function updateQuantity(cart: CartItem[], variantId: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeFromCart(cart, variantId);
  return cart.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(quantity, MAX_PER_ITEM, i.maxQuantity) } : i));
}

export function removeFromCart(cart: CartItem[], variantId: string): CartItem[] {
  return cart.filter((i) => i.variantId !== variantId);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + i.quantity, 0);
}

export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((s, i) => s + i.priceCents * i.quantity, 0);
}

export function serializeCart(cart: CartItem[]): string {
  return JSON.stringify(cart);
}

export function deserializeCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // Garde-fous : ne conserver que les lignes valides
    return parsed.filter(
      (i) => i && typeof i.variantId === 'string' && typeof i.priceCents === 'number' && typeof i.quantity === 'number' && i.quantity > 0
    );
  } catch {
    return [];
  }
}
