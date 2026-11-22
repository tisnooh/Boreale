import type { HomepageSettings } from './types';

/** Honest local editorial defaults; never a supplier, price or delivery promise. */
export const HOMEPAGE_FALLBACK: HomepageSettings = {
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
