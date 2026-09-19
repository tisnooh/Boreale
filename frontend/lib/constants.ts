/** Constantes de la marque et du site (miroir des règles backend — docs/BRANDING.md). */

export const BRAND = {
  name: 'BORÉALE',
  slogan: "L'hiver, du bon côté.",
  supportEmail: 'bonjour@votre-domaine.fr', // ⚠️ à remplacer par l'email réel du domaine vérifié
  legalName: '[RAISON SOCIALE À COMPLÉTER]',
} as const;

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Grille de livraison — identique au backend (src/services/pricing.ts). */
export const SHIPPING = {
  standard: { label: 'Livraison standard', etaLabel: '48-72 h ouvrées', priceCents: 490, freeAboveCents: 6900 },
  express: { label: 'Livraison express', etaLabel: '24-48 h ouvrées', priceCents: 990, freeAboveCents: null },
} as const;

export const NAV_COLLECTIONS = [
  { slug: 'confort-textile', name: 'Confort & Textile' },
  { slug: 'chaleur', name: 'Chaleur' },
  { slug: 'auto-hiver', name: 'Auto Hiver' },
  { slug: 'maison-cocooning', name: 'Maison / Cocooning' },
] as const;

export const FOOTER_LINKS = {
  boutique: [
    { href: '/collections', label: 'Toute la collection' },
    { href: '/collections#packs', label: 'Packs & bundles' },
    { href: '/track-order', label: 'Suivre ma commande' },
  ],
  aide: [
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
    { href: '/legal/returns', label: 'Retours & remboursements' },
    { href: '/legal/terms', label: 'CGV' },
    { href: '/legal/privacy', label: 'Confidentialité' },
  ],
  maison: [
    { href: '/about', label: 'Notre histoire' },
    { href: '/account', label: 'Mon compte' },
  ],
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de paiement',
  paid: 'Payée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  partially_refunded: 'Remboursée partiellement',
  refunded: 'Remboursée',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-cream text-ink-500',
  paid: 'bg-glacier/15 text-glacier-dark',
  processing: 'bg-glacier/15 text-glacier-dark',
  shipped: 'bg-success/10 text-success',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-danger/10 text-danger',
  partially_refunded: 'bg-danger/10 text-danger',
  refunded: 'bg-danger/15 text-danger',
};
