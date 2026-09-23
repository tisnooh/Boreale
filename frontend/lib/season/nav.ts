import { NAV_COLLECTIONS } from '@/lib/constants';
import { SUMMER_CATEGORIES } from '@/lib/season/content-summer';
import type { ShopSeason } from '@/lib/season/types';

export interface NavLink {
  slug: string;
  name: string;
}

/** Navigation collections selon la saison courante (header desktop + mobile). */
export function getSeasonNav(season: ShopSeason): NavLink[] {
  if (season === 'summer') {
    return SUMMER_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }));
  }
  return NAV_COLLECTIONS.map((c) => ({ slug: c.slug, name: c.name }));
}

/** Liens « boutique » du footer selon la saison. */
export function getSeasonFooterLinks(season: ShopSeason): { href: string; label: string }[] {
  if (season === 'summer') {
    return [
      { href: '/collections?saison=ete', label: 'Toute la collection été' },
      { href: '/ete#packs', label: 'Packs d’été (à venir)' },
      { href: '/track-order', label: 'Suivre ma commande' },
    ];
  }
  return [
    { href: '/collections', label: 'Toute la collection' },
    { href: '/collections#packs', label: 'Packs & bundles' },
    { href: '/track-order', label: 'Suivre ma commande' },
  ];
}

/** Libellé de la section produits liés selon la saison du produit. */
export function relatedTitle(season: 'winter' | 'summer' | 'all-season'): string {
  if (season === 'summer') return 'Complétez votre été';
  if (season === 'all-season') return 'Complétez votre saison';
  return 'Complétez votre hiver';
}
