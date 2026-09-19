import { logger } from '../lib/logger.js';
import { settingsRepo } from '../repositories/misc.js';

/** Homepage content managed from the admin (Phase 6). Defaults match the seed. */
export interface HomepageSettings {
  announcementBar: string | null;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    image: string | null;
  };
  benefits: { icon: string; title: string; text: string }[];
  featuredProductSlugs: string[];
  bundleSlugs: string[];
  faq: { q: string; a: string }[];
}

export const HOMEPAGE_DEFAULTS: HomepageSettings = {
  announcementBar: 'Livraison offerte dès 69 € · Expédié depuis la France · Retours sous 30 jours',
  hero: {
    eyebrow: 'Collection Hiver',
    title: 'L’hiver, du bon côté.',
    subtitle:
      'Des essentiels chauds, beaux et durables pour affronter le froid — sélectionnés et testés, expédiés depuis la France.',
    ctaLabel: 'Découvrir la collection',
    ctaHref: '/collections',
    secondaryCtaLabel: 'Voir les packs',
    secondaryCtaHref: '/collections#packs',
    image: '/images/hero-hiver.jpg',
  },
  benefits: [
    { icon: 'truck', title: 'Expédition France', text: 'Préparé et expédié depuis la France sous 24-48 h ouvrées.' },
    { icon: 'shield', title: 'Paiement sécurisé', text: 'Stripe — cartes bancaires, Apple Pay, Google Pay.' },
    { icon: 'return', title: 'Retours 30 jours', text: 'Un produit ne convient pas ? Retour simple sous 30 jours.' },
    { icon: 'sparkle', title: 'Sélection testée', text: 'Chaque produit est choisi et essayé avant d’entrer au catalogue.' },
  ],
  featuredProductSlugs: [
    'chaussons-bouillotte-foyer',
    'housse-pare-brise-sentinelle',
    'plaid-sherpa-nid',
    'chaussettes-polaires-nuage',
  ],
  bundleSlugs: ['pack-cocooning', 'pack-grand-froid', 'pack-auto-hiver', 'pack-ski'],
  faq: [
    { q: 'Quels sont les délais de livraison ?', a: 'Les commandes sont préparées sous 24-48 h ouvrées depuis la France. Livraison standard : 48-72 h ouvrées (offerte dès 69 €). Express : 24-48 h ouvrées.' },
    { q: 'Puis-je retourner un article ?', a: 'Oui, vous disposez de 30 jours après réception pour un retour, article non porté et dans son emballage. Remboursement sous 5 jours ouvrés après réception.' },
    { q: 'Le paiement est-il sécurisé ?', a: 'Les paiements sont traités par Stripe (carte, Apple Pay, Google Pay). Nous ne stockons jamais vos données bancaires.' },
    { q: 'Comment suivre ma commande ?', a: 'Un email de suivi vous est envoyé à l’expédition. Vous pouvez aussi suivre votre commande via la page Suivi avec votre numéro de commande et votre email.' },
    { q: 'Les produits chauffants sont-ils électriques ?', a: 'Non : au lancement, nous ne proposons que des produits chauffants sans électricité (bouillottes sèches, chauffe-mains réutilisables, chaussons micro-ondes), plus simples et sûrs à utiliser.' },
  ],
};

function mergeHomepage(stored: unknown): HomepageSettings {
  if (!stored || typeof stored !== 'object') return HOMEPAGE_DEFAULTS;
  const s = stored as Partial<HomepageSettings>;
  return {
    ...HOMEPAGE_DEFAULTS,
    ...s,
    hero: { ...HOMEPAGE_DEFAULTS.hero, ...(s.hero ?? {}) },
    benefits: s.benefits ?? HOMEPAGE_DEFAULTS.benefits,
    featuredProductSlugs: s.featuredProductSlugs ?? HOMEPAGE_DEFAULTS.featuredProductSlugs,
    bundleSlugs: s.bundleSlugs ?? HOMEPAGE_DEFAULTS.bundleSlugs,
    faq: s.faq ?? HOMEPAGE_DEFAULTS.faq,
  };
}

export const settingsService = {
  async getHomepage(): Promise<HomepageSettings> {
    try {
      const stored = await settingsRepo.get<unknown>('homepage');
      return mergeHomepage(stored);
    } catch (err) {
      logger.warn('homepage_settings_unavailable — defaults utilisés', err instanceof Error ? err.message : err);
      return HOMEPAGE_DEFAULTS;
    }
  },

  async setHomepage(value: HomepageSettings): Promise<HomepageSettings> {
    const merged = mergeHomepage(value);
    await settingsRepo.set('homepage', merged);
    return merged;
  },
};
