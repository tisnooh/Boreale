import type { CategoryDTO, HomepageSettings } from '@/lib/types';
import type { Season } from './types';

/**
 * Contenu ÉTÉ de préproduction : taxonomie + narration commerciale.
 * AUCUN produit, prix, stock, fournisseur, avis ou certification inventés :
 * la sélection été arrivera via le sourcing (phase séparée) et la vraie base.
 */

export const SUMMER_CATEGORIES: CategoryDTO[] = [
  { id: 'sc1', slug: 'plage-piscine', name: 'Plage & Piscine', tagline: 'Le soleil, sans les coups de soleil', description: 'Accessoires de plage et de piscine, serviettes et confort, rangement malin, protection solaire.', imageUrl: '/images/summer/cat-plage-piscine.svg', season: 'summer' as Season },
  { id: 'sc2', slug: 'voyage', name: 'Voyage', tagline: 'Partir léger, arriver frais', description: 'Accessoires de voyage, organisation, bagagerie légère, confort en transport.', imageUrl: '/images/summer/cat-voyage.svg', season: 'summer' as Season },
  { id: 'sc3', slug: 'fraicheur', name: 'Fraîcheur', tagline: 'Garder la tête froide', description: 'Accessoires rafraîchissants et solutions pratiques contre la chaleur.', imageUrl: '/images/summer/cat-fraicheur.svg', season: 'summer' as Season },
  { id: 'sc4', slug: 'outdoor', name: 'Outdoor', tagline: 'Dehors, tout simplement', description: 'Pique-nique, camping léger, extérieur et loisirs d’été.', imageUrl: '/images/summer/cat-outdoor.svg', season: 'summer' as Season },
  { id: 'sc5', slug: 'auto-ete', name: 'Auto Été', tagline: 'La voiture au frais', description: 'Pare-soleil, organisation de voiture, protection chaleur, accessoires de trajets estivaux.', imageUrl: '/images/summer/cat-auto-ete.svg', season: 'summer' as Season },
  { id: 'sc6', slug: 'maison-terrasse', name: 'Maison & Terrasse', tagline: 'Vivre dehors, même chez soi', description: 'Confort extérieur, accessoires de terrasse, organisation et produits pratiques d’été.', imageUrl: '/images/summer/cat-maison-terrasse.svg', season: 'summer' as Season },
];

export const SUMMER_HOMEPAGE: HomepageSettings = {
  announcementBar: null,
  hero: {
    eyebrow: 'Collection Été',
    title: 'L’été, à ciel ouvert.',
    subtitle:
      'Des essentiels lumineux et malins pour la plage, les trajets et les terrasses — sélectionnés avec la même exigence que l’hiver.',
    ctaLabel: 'Découvrir l’été',
    ctaHref: '/collections?saison=ete',
    secondaryCtaLabel: 'Voir les univers',
    secondaryCtaHref: '/ete#univers',
    image: '/images/summer/hero-ete.jpg',
  },
  benefits: [
    { icon: 'truck', title: 'Expédition France', text: 'Préparé et expédié depuis la France sous 24-48 h ouvrées.' },
    { icon: 'shield', title: 'Paiement sécurisé', text: 'Stripe — cartes bancaires, Apple Pay, Google Pay.' },
    { icon: 'return', title: 'Retours 30 jours', text: 'Un produit ne convient pas ? Retour simple sous 30 jours.' },
    { icon: 'sparkle', title: 'Sélection testée', text: 'Chaque produit est choisi et essayé avant d’entrer au catalogue.' },
  ],
  featuredProductSlugs: [],
  bundleSlugs: [],
  faq: [
    { q: 'La boutique été est-elle déjà ouverte ?', a: 'L’univers été est en préparation : les univers et la narration sont en place, la sélection de produits arrive après une phase de sourcing dédiée. Inscrivez-vous au courrier d’été pour être prévenu.' },
    { q: 'Puis-je commander des produits hiver et été ensemble ?', a: 'Oui : le panier, le checkout et votre compte sont uniques et communs aux deux saisons.' },
    { q: 'Les retours sont-ils identiques en été ?', a: 'Oui : 30 jours pour changer d’avis, quelle que soit la saison du produit.' },
    { q: 'Y aura-t-il des packs été ?', a: 'Le système de packs est prêt : les compositions été seront publiées avec la sélection, avec des économies réelles calculées sur les prix du moment.' },
    { q: 'Comment passer de l’hiver à l’été ?', a: 'Utilisez le sélecteur Hiver / Été présent dans l’en-tête sur tous les écrans, ou les adresses / et /ete.' },
  ],
};

/** Concepts de packs été : structure visuelle prête, compositions et prix viendront du sourcing. */
export const SUMMER_PACK_CONCEPTS = [
  { name: 'Pack Plage', univers: 'Plage & Piscine · Fraîcheur', note: 'Composition en cours — sourcing été' },
  { name: 'Pack Voyage Frais', univers: 'Voyage · Auto Été', note: 'Composition en cours — sourcing été' },
  { name: 'Pack Terrasse', univers: 'Maison & Terrasse · Outdoor', note: 'Composition en cours — sourcing été' },
] as const;

/** Bloc inspiration : trois univers mis en image. */
export const SUMMER_INSPIRATION = [
  { slug: 'plage-piscine', label: 'Au bord de l’eau', image: '/images/summer/cat-plage-piscine.svg', text: 'Serviettes qui sèchent vite, rangement sans sable, ombre maîtrisée.' },
  { slug: 'outdoor', label: 'Dehors tout l’après-midi', image: '/images/summer/cat-outdoor.svg', text: 'Pique-nique léger, camping simple, loisirs sans logistique lourde.' },
  { slug: 'maison-terrasse', label: 'Soirées terrasse', image: '/images/summer/cat-maison-terrasse.svg', text: 'Confort d’extérieur, fraîcheur conservée, table prête en cinq minutes.' },
] as const;

export const SUMMER_QUOTE = {
  image: '/images/summer/hero-ete.jpg',
  text: ['« L’été n’est pas une saison à subir.', 'C’est une saison à habiter. »'],
} as const;
