/**
 * Architecture saisonnière BORÉALE — UNE seule application, deux univers commerciaux.
 * Winter = expérience historique conservée ; Summer = nouvelle direction ;
 * all-season = produits/catégories visibles dans les deux univers.
 */
export type Season = 'winter' | 'summer' | 'all-season';

/** Saisons « boutique » (celles qui ont une home et un thème). */
export type ShopSeason = 'winter' | 'summer';

export const SEASON_LABELS: Record<ShopSeason, string> = {
  winter: 'Hiver',
  summer: 'Été',
};

/** Une catégorie/produit all-season appartient aux deux univers. */
export function matchesShopSeason(itemSeason: Season, shop: ShopSeason): boolean {
  return itemSeason === shop || itemSeason === 'all-season';
}
