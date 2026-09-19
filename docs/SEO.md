# SEO.md — Stratégie & implémentation

## Ce qui est implémenté (code)
| Élément | Où |
|---|---|
| `metadataBase` + titles/descriptions par page | `app/layout.tsx`, `lib/seo.ts` (`buildMetadata`) |
| Canonical systématique (`alternates.canonical`) | `buildMetadata` — chaque page déclare son URL |
| Open Graph + Twitter Card (image 1200×63) | `buildMetadata` (image hero par défaut, image produit sur les fiches) |
| `sitemap.xml` dynamique (pages fixes + collections + produits réels depuis l'API) | `app/sitemap.ts` |
| `robots.txt` (allow tout, disallow /admin /checkout /account /order /cart) | `app/robots.ts` |
| JSON-LD **Product** (offers par variante, disponibilité réelle, marque) | `app/products/[slug]/page.tsx` + `lib/seo.ts` |
| JSON-LD **Organization** | homepage |
| JSON-LD **BreadcrumbList** | fiches produits, collections, /about, /faq |
| JSON-LD **FAQPage** | homepage + /faq (contenu piloté par l'admin) |
| SEO par produit éditable dans l'admin | champs `seoTitle`/`seoDescription` (Produits → édition) |
| noindex des pages privées/transactionnelles | layouts /admin, /account, /checkout, /order, /track-order |
| Hiérarchie Hn unique, liens fil d'Ariane, `aria-label` | toutes les pages |
| Polices `next/font` (self-hosted, `display: swap`, pas de FOUT bloquant) | `app/layout.tsx` |
| Images `next/image` (dimensionnement, lazy, priority sur hero/above-fold) | composants produit/home |
| `prefers-reduced-motion`, skip-link, focus visibles | `styles/globals.css`, layout |

## Core Web Vitals — partis pris
- **LCP** : hero en `next/image priority` ; pages catalogue SSR légères (< 60 Ko HTML) ; pas de librairie UI externe (tout est inline/CSS).
- **CLS** : images avec dimensions fixes (aspect-ratio), polices avec métriques fallback via next/font.
- **INP** : très peu de JS client (panier, formulaires, admin) ; pas de trackers au lancement.
- Vérifier après déploiement : PageSpeed Insights + CrUX dans Search Console (48 h de données minimum).

## Architecture de contenu
- `/collections` (hub) → `/collections/[slug]` (4 univers, descriptions uniques ≥ 60 mots rédigées dans le seed) → `/products/[slug]` (descriptions longues uniques : bénéfices, specs, conseils, entretien).
- Slugs courts, sans accents, stables (`chaussons-bouillotte-foyer`).
- Maillage : produits liés (même collection), packs ↔ composants, footer.

## Plan de contenu post-lancement (recommandé, hors code)
1. Guide « Comment choisir sa bouillotte sèche » (cluster autour de /collections/chaleur).
2. « Pare-brise gelé : 7 méthodes (et la seule qui marche vraiment) » (cluster Auto Hiver — fort volume Q4).
3. « Quel plaid pour quel usage ? » (cluster Maison).
4. Pages cadeaux Noël (`/collections?tag=cadeau`) dès novembre.
⚠️ Ne publier aucun chiffre, avis ou comparaison non vérifiable.

## Intention de recherche ciblée (exemples)
| Requête | Page |
|---|---|
| chaussons bouillotte micro-ondes | /products/chaussons-bouillotte-foyer |
| housse pare-brise antigivre | /products/housse-pare-brise-sentinelle |
| chaussettes polaires chaudes | /products/chaussettes-polaires-nuage |
| cadeau cocooning hiver / pack hiver | /collections#packs |
| bouillotte noyaux de cerise | /products/bouillotte-noyaux-cerise-brasero |

## À faire par le propriétaire
- Search Console + Bing Webmaster (après déploiement), soumettre le sitemap.
- OG image dédiée générée et câblée : `public/og/og-default.png` (à remplacer par une version avec le logo final validé si le nom change).
- Quand le domaine est choisi : mettre à jour `NEXT_PUBLIC_SITE_URL` / `PUBLIC_SITE_URL` (canonical, sitemap et JSON-LD suivent automatiquement).
