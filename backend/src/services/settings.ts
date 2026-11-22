import { logger } from '../lib/logger.js';
import { settingsRepo } from '../repositories/misc.js';

/** Homepage content managed from the admin (Phase 6). Defaults describe the five draft priorities without commercial promises. */
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
  announcementBar: null,
  hero: {
    eyebrow: 'Collection Hiver', title: 'L’hiver, du bon côté.',
    subtitle: 'Une sélection courte pour les mains, les pieds et les moments chez soi. Cinq essentiels en préparation, dans des teintes sobres.',
    ctaLabel: 'Découvrir la collection', ctaHref: '/collections',
    secondaryCtaLabel: 'Notre sélection', secondaryCtaHref: '/#selection',
    image: '/images/hero-hiver.jpg',
  },
  benefits: [
    { icon: 'sparkle', title: 'Une sélection courte', text: 'Contact, Refuge, Braise et Nuage, complétés par des semelles isolantes.' },
    { icon: 'shield', title: 'Des références à vérifier', text: 'Les caractéristiques et les modèles sont confirmés avant toute mise en vente.' },
    { icon: 'truck', title: 'Une livraison à préciser', text: 'Les destinations, frais et délais seront indiqués après validation des fournisseurs.' },
    { icon: 'return', title: 'Des conditions transparentes', text: 'Les modalités de retour seront précisées avant l’ouverture des ventes.' },
  ],
  featuredProductSlugs: ['gants-tactiles-contact', 'chaussons-fourres-refuge', 'chauffe-mains-reutilisables-braise', 'chaussettes-polaires-nuage', 'semelles-thermiques-isolantes'],
  bundleSlugs: [],
  faq: [
    { q: 'Peut-on déjà commander ?', a: 'La sélection est en préparation. Les produits dont le modèle et les conditions ne sont pas confirmés ne sont pas proposés à la vente.' },
    { q: 'Quels seront les délais de livraison ?', a: 'Les frais, destinations et délais seront précisés après validation du fournisseur et du mode d’expédition de chaque référence.' },
    { q: 'Quelles sont les conditions de retour ?', a: 'Les conditions détaillées seront disponibles avant toute ouverture des ventes.' },
    { q: 'Comment les produits sont-ils choisis ?', a: 'La sélection se concentre sur cinq essentiels sobres. Modèles, matières, variantes, photographies et conditions commerciales restent à vérifier.' },
    { q: 'La sélection comprend-elle des produits électriques ?', a: 'Les cinq priorités sont recherchées sans batterie ni branchement. Les caractéristiques et consignes de chaque modèle seront vérifiées avant sa mise en vente.' },
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
