# FRONTEND_READY.md — État « conception & frontend terminés »

> Objectif de la phase : le produit frontend est **complet et validable visuellement/techniquement**
> AVANT connexion de l'infrastructure réelle. Ce document décrit ce qui est terminé, ce qui est
> volontairement désactivé, et comment brancher la suite sans réécrire les composants.

## 1. Architecture
```
frontend/
├── app/                  # 30 routes App Router (boutique, compte, checkout, admin, légales)
├── components/
│   ├── layout/           # Header, Footer, CartDrawer, PreviewBanner, OfflineNotice, Logo
│   ├── home/             # Hero, CategoryGrid, Benefits, FaqSection, NewsletterForm
│   ├── product/          # ProductCard, ProductPurchase, BundleContents
│   ├── admin/            # AdminShell, ProductForm
│   └── ui/               # StatusBadge, Spinner, EmptyState, QtyStepper, SafeImage
├── hooks/                # use-cart (localStorage), use-auth, use-toast
├── lib/
│   ├── config.ts         # NEXT_PUBLIC_SITE_MODE (preview | live)
│   ├── catalog/          # source.ts (abstraction) + preview-data.ts (démo isolée)
│   ├── services/         # actions.ts (checkout/contact/newsletter/discount/auth-guard)
│   ├── api.ts / api-server.ts / types.ts / format.ts / totals.ts / seo.ts / cart-*.ts
├── styles/globals.css    # design system Tailwind v4 (tokens BORÉALE)
└── tests/                # 51 tests Vitest + Testing Library
```

## 2. Mode preview (défaut) vs mode live
| | `NEXT_PUBLIC_SITE_MODE=preview` (défaut) | `=live` |
|---|---|---|
| Catalogue | données de démo locales (`lib/catalog/preview-data.ts`) | `GET /api/products|categories|bundles|settings/homepage` |
| Bandeau | « Mode preview » visible sur tout le site | absent |
| Checkout | message honnête « paiement disponible à l'ouverture » ; **aucune commande créée** | session Stripe via backend |
| Auth / admin | garde explicite `preview_mode` (aucun compte simulé) | JWT backend |
| Newsletter/contact | « non envoyé / non enregistré » dit explicitement | appels réels |
| JSON-LD Produit | **supprimé** (pas de schema sur données de démo) | émis |
| API absente | n'existe pas (pas d'appel réseau) | états vides honnêtes, 404 produit, aucun crash |

Changer de mode = **une variable d'environnement**, zéro modification de composant
(`lib/catalog/source.ts` est le seul point de branchement).

## 3. Lancement local
```bash
cd frontend
cp .env.example .env.local      # NEXT_PUBLIC_SITE_MODE=preview par défaut
npm install && npm run dev      # http://localhost:3000
```
Commandes : `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`
(ou `build:lowmem` = webpack pour machines < 2 Go ; Vercel utilisera Turbopack).

## 4. Vérifications réalisées (résultats réels)
- `npm run lint` : 0 erreur (13 warnings assumés `react-hooks/set-state-in-effect`, DECISIONS D021).
- `npm run typecheck` : 0 erreur (TS strict).
- `npm run test` : **51/51** (panier, prix, API client, restore, catalogue preview, services preview,
  header mobile + ESC, bannière, ProductCard, format).
- `npm run build` : ✓ 30 routes compilées (preview ET live).
- Smoke test `next start` preview : `/`, `/collections`, `/collections/chaleur`,
  `/products/chaussons-bouillotte-foyer`, `/cart`, `/checkout`, `/account`, `/track-order`,
  `/faq`, `/contact`, `/about`, `/legal/*`, `/admin/login` → 200 ; `/inconnue` → 404 ;
  contenu démo + bannière présents ; panier/achat rendus.
- Smoke test `next start` live sans API : 200 avec états vides honnêtes, 404 produit, aucune bannière preview.

## 5. Pages / routes (30)
`/` · `/collections` · `/collections/[slug]` · `/products/[slug]` · `/cart` · `/checkout` ·
`/checkout/success` · `/checkout/cancel` · `/account` · `/account/orders` · `/order/[id]` ·
`/track-order` · `/faq` · `/contact` · `/about` · `/legal/privacy` · `/legal/terms` ·
`/legal/returns` · `/admin` · `/admin/login` · `/admin/produits` · `/admin/produits/nouveau` ·
`/admin/produits/[id]` · `/admin/commandes` · `/admin/commandes/[id]` · `/admin/clients` ·
`/admin/promotions` · `/admin/newsletter` · `/admin/contenu` · `/admin/messages`
+ `sitemap.xml`, `robots.txt`, `icon.svg`.

## 6. Design conservé / amélioré
Conservé : identité BORÉALE, palette nuit polaire/glace/braise, Fraunces + Inter, style des
composants, navigation, animations sobres, sections homepage.
Amélioré : contraste des liens texte (ember → ember-dark sur fond clair, AA), focus management
du drawer (focus entrant/sortant), ESC + `aria-controls` sur le menu mobile, repli d'image
cassée (SafeImage), bandeau offline, états preview/empty/error homogènes, imports morts retirés.

## 7. Données temporaires (isolées, remplaçables sans refonte)
- `lib/catalog/preview-data.ts` : 10 produits + 2 packs + 4 collections (démo, jamais en live).
- Panier : localStorage (`boreale_cart_v1`) — volontairement local en phase frontend.
- Aucun stock/prix/fournisseur/avis réel n'est affirmé ; placeholders juridiques =
  `[RAISON SOCIALE]`, `[À RENSEIGNER AVANT MISE EN PRODUCTION]` uniquement sur les pages légales.

## 8. Services NON connectés (volontairement)
Supabase · Stripe (TEST et LIVE) · Resend · auth réelle · API backend · stocks réels ·
commandes réelles · cron réel · domaine/DNS · Vercel. Aucun compte créé, aucune clé injectée.

## 9. Variables attendues plus tard (frontend)
`NEXT_PUBLIC_SITE_MODE` · `NEXT_PUBLIC_API_URL` · `NEXT_PUBLIC_SITE_URL` — c'est tout.
(Les secrets vivent uniquement côté backend : voir `backend/.env.example`.)

## 10. Prochaine phase (intégration)
FRONTEND VALIDÉ → GITHUB → DONNÉES PRODUITS RÉELLES (seed ajusté) → SUPABASE → BACKEND →
AUTH → STRIPE TEST → RESEND → VERCEL → DOMAINE → TESTS E2E → PRODUCTION.
Brancher = passer `NEXT_PUBLIC_SITE_MODE=live` + renseigner `NEXT_PUBLIC_API_URL`.
