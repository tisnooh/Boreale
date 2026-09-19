# PLAN — BORÉALE (marque hiver, provisoire)

> Projet e-commerce hiver, marché français. Monorepo `winter-store/` : `frontend/` (Next.js) et `backend/` (API Vercel serverless + Supabase + Stripe), déployables comme **2 projets Vercel distincts** (Root Directory = `frontend` et `backend`).

## Vision
Une marque hiver française premium-accessible, mono-saison (octobre → mars), qui vend des essentiels testés et sélectionnés contre le froid, autour de 4 univers : Confort & Textile, Chaleur, Auto Hiver, Maison / Cocooning.

## Positionnement
- **Cible** : 25-55 ans, France, sensibles au froid (frileux, automobilistes, télétravail, familles), achat plaisir + utilitaire.
- **Promesse** : « L'hiver, du bon côté. » — des produits chauds, beaux, durables, livrés vite depuis la France.
- **Différenciation** : curation (pas de catalogue fourre-tout), bundles prêts à offrir, contenu social fort (TikTok/Reels), service client réactif, transparence (pas de faux avis, pas de faux prix barrés).

## Phases

### Phase 1 — Recherche produits (`docs/PRODUCT_RESEARCH.md`)
- 30 produits analysés (douleur, demande, concurrence, potentiel social, prix, coûts **estimés à valider fournisseur**, logistique, réglementation, marge).
- Sélection finale : **14 produits** + **4 bundles** (Cocooning, Grand Froid, Auto Hiver, Ski).
- 1 hero product : **Chaussons bouillotte « Foyer »** (fort potentiel TikTok, marge, cadeau).
- 3 produits d'appel : Gant grattoir polaire (12,90 €), Chauffe-mains réutilisables (16,90 €), Cache-cou polaire « Bise » (19,90 €).
- 3 upsells : Bouillotte noyaux de cerise « Brasero », Legging thermique, Plaid à manches « Cocon ».
- Aucune donnée fournisseur inventée : les coûts sont des **fourchettes d'estimation publique à vérifier avant commande**.

### Phase 2 — Branding (`docs/BRANDING.md`)
- Nom provisoire : **BORÉALE** (à valider : INPI + domaine).
- Logo SVG + favicon, palette Nuit polaire / Glace / Braise, typographies Fraunces + Inter, ton éditorial, design system documenté.

### Phase 3 — Frontend (Next.js App Router, Tailwind, mobile-first)
Pages : `/`, `/collections`, `/collections/[slug]`, `/products/[slug]`, `/cart`, `/checkout` (+ succès/échec), `/account` (+ `/account/orders`), `/order/[id]`, `/track-order`, `/faq`, `/contact`, `/about`, `/legal/privacy|terms|returns`, `/admin` (back-office complet).

### Phase 4 — Base de données (`docs/DATABASE.md`)
Supabase/Postgres : users, profiles, products, product_variants, categories, product_categories, inventory, customers, addresses, orders, order_items, payments, discounts, newsletter_subscribers, newsletter_campaigns, admin_users, order_events, abandoned_carts, contact_messages, site_settings. **RLS activée partout** (accès public lecture catalogue uniquement ; écriture via backend service-role).

### Phase 5 — Stripe (mode TEST)
Checkout Session créée **côté backend avec recalcul serveur des prix**, webhook signé (`checkout.session.completed`, `expired`, `refunds`), statuts de paiement, remboursements admin, pages succès/échec. Aucune clé privée côté frontend.

### Phase 6 — Admin
Back-office réel : dashboard (stats réelles), produits/variantes/prix/stocks, commandes (statuts, remboursement), clients, promotions (codes), newsletter (abonnés + campagne), contenu homepage (hero, badges, produits vedettes).

### Phase 7 — Emails (Resend)
Bienvenue, confirmation de commande, paiement, expédition, remboursement, panier abandonné (cron), newsletter. Mode dev sans clé : logs console (documenté, pas de simulation trompeuse).

### Phase 8 — Marketing (`docs/MARKETING.md`)
30 concepts TikTok/Reels, 10 scripts UGC, 10 angles publicitaires, playbooks Black Friday, Noël, grand froid, cadeaux, auto, cocooning.

### Phase 9 — SEO (`docs/SEO.md`)
Metadata par page, sitemap dynamique, robots.txt, canonical, JSON-LD Product/Organization/BreadcrumbList/FAQ, pages collections optimisées, Core Web Vitals (SSR léger, polices next/font, images optimisées).

### Phase 10 — API (`docs/API.md`)
API REST documentée, CORS strict (FRONTEND_URL uniquement en prod, localhost en dev, credentials), validation Zod sur toutes les entrées, rate-limit auth, gestion d'erreurs normalisée.

## Livrables finaux
- Build, lint, typecheck, tests OK sur frontend **et** backend.
- Docs : README racine, README frontend, README backend, docs/*.md (DATABASE, API, DEPLOYMENT, SEO, SECURITY, MARKETING, PRODUCT_RESEARCH, BRANDING, QA_TEST_PLAN).
- Checklist de mise en production (ce qui exige le propriétaire : comptes, clés, domaine, juridique).

## Hors périmètre assumé (décisions)
- Produits chauffants **électriques** exclus au lancement (conformité CE/DEEE non vérifiable sans fournisseur réel).
- Pas d'avis clients affichés tant qu'aucun avis réel n'existe (interdiction des faux avis).
- Pas de prix barrés fictifs (directive Omnibus) : seules les économies **réelles** des bundles sont affichées.
