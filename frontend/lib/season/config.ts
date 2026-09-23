import type { ShopSeason } from './types';

/**
 * Configuration centrale des saisons.
 *
 * DEFAULT_SEASON décide ce que affiche "/" :
 *  - 'winter' (défaut actuel) : "/" rend la boutique hiver historique (déjà déployée, SEO conservé),
 *    "/ete" rend la boutique été, "/hiver" rend l'hiver avec canonical vers "/".
 *  - 'summer' (bascule future, sans rien toucher d'autre) : "/" redirige vers "/ete".
 *
 * Aucun automatisme basé sur la date : l'utilisateur garde toujours accès aux deux univers
 * via le switch Hiver / Été présent dans l'en-tête (DECISIONS.md D038).
 */
export const DEFAULT_SEASON: ShopSeason =
  process.env.NEXT_PUBLIC_DEFAULT_SEASON === 'summer' ? 'summer' : 'winter';

/** Détermine la saison boutique courante d'après l'URL (serveur & client). */
export function getSeasonFromPath(pathname: string | null | undefined): ShopSeason {
  if (!pathname) return 'winter';
  if (pathname === '/ete' || pathname.startsWith('/ete/')) return 'summer';
  return 'winter';
}

/** Clé de réglage admin de la homepage selon la saison (système mutualisé settings). */
export function homepageSettingsKey(season: ShopSeason): string {
  return season === 'summer' ? 'homepage-summer' : 'homepage';
}
