/**
 * Encodage/décodage du lien de restauration de panier (emails panier abandonné).
 * Payload = liste {variantId, quantity} en base64url — PAS une frontière de sécurité :
 * les prix et stocks sont re-vérifiés côté serveur au checkout (le payload ne sert
 * qu'à re-remplir le panier visuel). Testé dans tests/cart-restore.test.ts.
 * Implémentation navigateur-safe (btoa/atob + TextEncoder/TextDecoder).
 */
import type { CartItem } from './cart-logic';

export interface RestoreItem {
  variantId: string;
  quantity: number;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(param: string): string {
  const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeRestore(items: RestoreItem[]): string {
  const clean = (Array.isArray(items) ? items : [])
    .filter((i) => !!i && typeof i.variantId === 'string' && typeof i.quantity === 'number' && i.quantity > 0 && i.quantity <= 20)
    .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  return toBase64Url(JSON.stringify(clean));
}

export function decodeRestore(param: string | null): RestoreItem[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(fromBase64Url(param)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RestoreItem =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as RestoreItem).variantId === 'string' &&
          typeof (x as RestoreItem).quantity === 'number' &&
          (x as RestoreItem).quantity > 0 &&
          (x as RestoreItem).quantity <= 20
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

/** Conversion d'une réponse /api/variants en lignes de panier visuel. */
export interface RestorableVariant {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  inStock: boolean;
  quantity: number | null;
  product: { slug: string; name: string; imageUrl: string | null } | null;
}

export function toCartItems(restored: RestoreItem[], variants: RestorableVariant[]): CartItem[] {
  const out: CartItem[] = [];
  for (const r of restored) {
    const v = variants.find((x) => x.id === r.variantId);
    if (!v || !v.product || !v.inStock) continue; // écarte les lignes indisponibles/rupture
    out.push({
      variantId: v.id,
      productSlug: v.product.slug,
      name: v.product.name,
      variantTitle: v.title,
      priceCents: v.priceCents,
      quantity: Math.min(r.quantity, Math.max(1, v.quantity ?? r.quantity), 20),
      imageUrl: v.product.imageUrl,
      maxQuantity: v.quantity ?? 20,
    });
  }
  return out;
}
