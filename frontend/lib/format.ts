/** Formatage — pure, testé (tests/format.test.ts). */

export function formatCents(cents: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatDate(iso: string, locale = 'fr-FR'): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTime(iso: string, locale = 'fr-FR'): string {
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Plus que 3 en stock" / "En stock" / "Rupture" */
export function stockLabel(quantity: number | null, lowStockThreshold = 5): string {
  if (quantity === null) return '';
  if (quantity <= 0) return 'Rupture de stock';
  if (quantity <= lowStockThreshold) return `Plus que ${quantity} en stock`;
  return 'En stock';
}

/** Progression vers la livraison offerte (0..1). */
export function freeShippingProgress(subtotalCents: number, thresholdCents: number): number {
  if (thresholdCents <= 0) return 1;
  return Math.min(1, Math.max(0, subtotalCents / thresholdCents));
}
