/** All money values are integer cents (€). Never floats. See DECISIONS.md D013. */

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function formatCents(cents: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function clampNonNegative(n: number): number {
  return Math.max(0, Math.round(n));
}
