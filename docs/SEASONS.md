# SEASONS.md — Architecture saisonnière BORÉALE (hiver + été, un seul moteur)

## Principe
UNE application, UN panier, UN checkout, UN compte, UN admin, UN backend — deux univers
commerciaux et visuels. Aucun composant dupliqué : le thème été est un **scope de tokens**.

## Noyau saison
| Fichier | Rôle |
|---|---|
| `frontend/lib/season/types.ts` | `Season = 'winter' \| 'summer' \| 'all-season'`, `matchesShopSeason` |
| `frontend/lib/season/config.ts` | `DEFAULT_SEASON` (env `NEXT_PUBLIC_DEFAULT_SEASON`), `getSeasonFromPath`, `homepageSettingsKey` |
| `frontend/lib/season/content-summer.ts` | taxonomie été (6 univers), homepage été, concepts packs, inspiration, citation |
| `frontend/styles/globals.css` | bloc `[data-season='summer']` : tokens lagune/sable/terracotta |
| `frontend/middleware.ts` | expose `x-pathname` au SSR (scope thème sans flash) |
| `frontend/components/layout/SeasonSwitch.tsx` | switch Hiver/Été (header desktop + mobile) |

## Routes
| Route | Contenu | Saison/scopes |
|---|---|---|
| `/` | home historique hiver | winter (ou redirect `/ete` si DEFAULT_SEASON=summer) |
| `/hiver` | alias home hiver | canonical → `/` (zéro duplication SEO) |
| `/ete` | home été (cover, univers, sélection, manifeste, packs, inspiration, FAQ, newsletter) | summer |
| `/collections` | index : univers hiver + bloc univers été | mixte |
| `/collections/[slug]` | collection quelle que soit sa saison | scope = `category.season` |
| `/products/[slug]` | fiche produit | scope = `product.season` |
| le reste (cart, checkout, account, order, track, faq, contact, about, legal, admin) | commun | neutre |

## Données
- Types `ProductDTO.season` / `CategoryDTO.season` ; preview : hiver complet + taxonomie été
  (sélection été vide, honnête) ; live : API avec filtre `?season=`.
- Base : `backend/supabase/migrations/0003_season.sql` (colonnes season, index, seed 6 univers été,
  clé settings `homepage-summer`).
- Admin : Contenu → onglets Hiver/Été (PUT `/api/admin/settings/:key` whitelisté) ;
  Produits → filtre Tous/Hiver/Été/All-season + colonne saison.

## Basculer la saison par défaut (plus tard, sans code)
`NEXT_PUBLIC_DEFAULT_SEASON=summer` → `/` redirige vers `/ete`. Retour : retirer la variable.
Aucune automatisation par date : les deux univers restent accessibles en permanence.

## Ce qui N'EST PAS inventé pour l'été
Produits, prix, stocks, fournisseurs, MOQ, coûts, ventes, avis, certifications, disponibilités :
rien. La sélection et les packs été afficheront leur état réel (« en préparation ») jusqu'au
sourcing, phase séparée.
