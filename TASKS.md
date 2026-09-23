# TASKS — suivi d'exécution

Légende : ✅ fait (par l'agent) · 🧑 à faire par le propriétaire · ➖ V2/hors périmètre lancement

## Phase 0 — Cadrage
- ✅ Structure monorepo `winter-store/` (frontend, backend, docs)
- ✅ PLAN.md, DECISIONS.md, TASKS.md, README.md
- 🧑 Valider le nom « BORÉALE » (INPI classes 25/24/12/35 + domaine .fr/.com) — voir D001
- 🧑 Acheter le domaine (bloquant : emails, URLs Stripe, SEO)

## Phase 1 — Recherche produits
- ✅ 30 produits analysés (`docs/PRODUCT_RESEARCH.md`) — coûts = fourchettes d'estimation à valider
- ✅ Sélection 14 produits + 4 bundles, hero/appel/upsells définis
- 🧑 Sourcer un **vrai fournisseur** (aucun fournisseur fictif dans le projet) : demander devis + échantillons + DoC pour les 14 produits
- 🧑 Valider conformité : étiquetage textile (décret 2012 / règl. UE 1007/2011), CLP pour tout produit chimique, sécurité jouet si marketing « enfant »
- ✅ Seed catalogue (14 produits, variantes, stocks de démarrage) dans `backend/supabase/seed.sql`
- ✅ SÉLECTION FINALE : shortlist 3 fournisseurs/produit vérifiés (statuts fabricant/trading confirmés par company_profile/registres) dans sourcing/suppliers/shortlist-final.md + 3 RFQ finales (EN envoi / FR contrôle) dans sourcing/rfqs-final/ ; en attente validation propriétaire avant envoi
- ✅ Sourcing Sentinelle/Nuage/Nid : 5 fournisseurs vérifiés chacun (pages publiques 2026-09-18, URLs dans sourcing/suppliers/*.md), 30 RFQ prêtes (sourcing/rfqs/), comparateur 39 lignes ; **MANUAL STOP** : envoi RFQ + échantillons = propriétaire
- 🔄 Sourcing Foyer : 5 fournisseurs vérifiés (pages publiques 2026-09-18) + 10 RFQ prêtes (`sourcing/rfqs/foyer/`) + fiche `sourcing/suppliers/foyer.md` ; **MANUAL STOP** : envoi des RFQ par le propriétaire (comptes plateformes), puis saisie devis
- ✅ Phase opérationnelle sourcing : `docs/RFQ_SUPPLIERS.md` (RFQ R1-R37 par produit, hero Foyer, packs A/B/C, tailles & guide), `docs/SUPPLIER_SCORECARD.md` (/100 + moteur GO/NEGOTIATE/NO GO), `docs/SAMPLE_TEST_PLAN.md` (checklist échantillons PASS/FAIL), `sourcing/` (csv 19 lignes, xlsx à formules, rfq-fr/en.txt)
- ✅ Validation commerciale du catalogue : `docs/SOURCING.md` (coûts max par produit à marge cible 65 % / plancher 55 %, risques, UGC, grille RFQ exacte — aucune donnée fournisseur inventée)

## Phase 2 — Branding
- ✅ Nom provisoire, positionnement, slogan, ton éditorial
- ✅ Logo SVG + favicon + OG image dédiée (`public/og/og-default.png`)
- ✅ Palette, typographies, design system (`docs/BRANDING.md`, tokens dans `frontend/styles/globals.css`)
- 🧑 Remplacer les visuels provisoires (SVG/IA) par de vraies photos produits — voir D016

## Phase 3 — Pages frontend
- ✅ Toutes les pages listées (accueil, collections, produit, panier, checkout + succès/échec, compte, commandes, suivi, FAQ, contact, à propos, légales ×3, admin)
- ✅ Responsive mobile-first, animations sobres, états UI (loading/erreur/vide)
- ✅ Panier visuel (drawer + page), compte client (JWT httpOnly cookie)

## Phase 4 — Database
- ✅ Migrations SQL : schéma complet + RLS + indexes + triggers (`backend/supabase/migrations/`)
- ✅ `docs/DATABASE.md` (relations, indexes, RLS, policies)
- 🧑 Créer le projet Supabase et appliquer migrations + seed (`supabase db push` ou SQL editor)

## Phase 5 — Stripe (TEST)
- ✅ Checkout Session (prix serveur), webhook signé, succès/échec, statuts paiement, remboursement admin
- ✅ Aucune clé privée côté frontend ; `STRIPE_WEBHOOK_SECRET` backend uniquement
- 🧑 Créer compte Stripe, renseigner clés TEST, configurer le webhook prod (`/api/webhooks/stripe`)
- 🧑 Passer en LIVE à J-7 du lancement (clés + webhook live)

## Phase 6 — Admin
- ✅ Dashboard stats réelles, produits/variantes/prix/stocks, commandes + statuts + remboursement, clients, promotions CRUD, newsletter (abonnés + envoi campagne), contenu homepage
- ✅ Création admin par script sécurisé (`npm run admin:create`)
- 🧑 Créer le premier compte admin en production

## Phase 7 — Emails
- ✅ 7 templates Resend (bienvenue, commande, paiement, expédition, remboursement, panier abandonné, newsletter)
- 🧑 Créer compte Resend + domaine d'envoi vérifié (SPF/DKIM) — bloquant emails réels
- ✅ Cron panier abandonné (vercel.json) + endpoint protégé par CRON_SECRET + lien de restauration du panier dans l'email (D025)

## Phase 8 — Marketing
- ✅ 30 concepts TikTok/Reels, 10 scripts UGC, 10 angles pub, 6 playbooks saisonniers (`docs/MARKETING.md`)
- 🧑 Produire le contenu réel (aucun chiffre/avis inventé ne doit être publié)
- ➖ Programme ambassadeurs/affiliation (V2)

## Phase 9 — SEO
- ✅ Metadata, sitemap dynamique, robots, canonical, JSON-LD (Product, Organization, Breadcrumb, FAQ)
- ✅ Pages collections optimisées, Core Web Vitals (voir `docs/SEO.md`)
- 🧑 Google Search Console + Bing Webmaster après déploiement ; soumettre le sitemap

## Phase 10 — API
- ✅ API REST complète + `docs/API.md`
- ✅ CORS strict (FRONTEND_URL/localhost, credentials, jamais `*`), validation Zod, rate-limit auth, erreurs normalisées

## Qualité
- ✅ `npm run lint` / `typecheck` / `test` / `build` verts sur backend
- ✅ `npm run lint` / `typecheck` / `test` / `build` verts sur frontend
- ✅ `docs/QA_TEST_PLAN.md` (mobile, desktop, compte, panier, Stripe, commandes, emails, permissions, admin, erreurs, sécurité, perf)
- 🧑 Exécuter la recette manuelle QA_TEST_PLAN sur l'environnement réel (Supabase + Stripe TEST) avant lancement
- ➖ Tests E2E Playwright (V2, une fois URLs réelles)

## Architecture saisonnière (hiver + été, une seule app)
- ✅ Noyau saison (types/config/thèmes/switch), routes /ete + /hiver, scopes collections/produits, header switch, middleware SSR
- ✅ Home été complète (cover, univers, sélection honnête « en préparation », manifeste, packs teaser, inspiration, FAQ, newsletter)
- ✅ Backend : migration 0003_season, filtre ?season=, settings homepage-summer, admin onglets/filtres saison
- ✅ 61 tests verts, lint 0 err, build ✓, smoke / /hiver /ete /collections/* ; checkpoint/before-summer-store + commit final

## Passe magazine + animations robustes
- ✅ Home magazine : cover plein écran, sommaire, index univers + aperçu curseur, rail horizontal, break parallaxe ; reduced-motion rescopé ; scroll-progress ; 51 tests verts, build ✓ (D034)

## Animations & packshots
- ✅ Animations éditoriales (reveal scroll, stagger, line-mask héro, ken burns, overlines animées) + 7 packshots IA provisoires + collage packs (D033) ; 6 visuels restants = SVG marque en attendant quota/photos réelles

## Passe design premium (post-déploiement V1)
- ✅ Homepage éditoriale (héro asymétrique, marquee, index univers, manifeste, packs sticky, wordmark footer) + cartes produit 4/5 + fiche produit sticky — identité conservée (D032) ; 51 tests verts, build ✓, smoke ✓

## Phase finale frontend (conception terminée)
- ✅ Checkpoint git `checkpoint/boreale-before-final-frontend` + audit complet (0 href="#", 0 TODO/lorem, 0 console.log, 0 `any`)
- ✅ Mode preview/live (`NEXT_PUBLIC_SITE_MODE`) + abstraction catalogue `lib/catalog/` + données démo isolées
- ✅ Services client (`lib/services/actions.ts`) : checkout/contact/newsletter/discount/auth-guard sans faux succès
- ✅ A11y & robustesse : focus drawer, ESC menu, aria-controls, contraste AA, SafeImage, OfflineNotice, PreviewBanner
- ✅ 51 tests verts · lint 0 err · typecheck 0 err · build preview ET live · smoke test 14 routes
- ✅ `docs/FRONTEND_READY.md` (état, modes, vérifications, prochaine phase)

## Déploiement
- ✅ `docs/DEPLOYMENT.md` (2 projets Vercel, domaines, DNS, webhooks, cron)
- ✅ `.env.example` frontend + backend, aucun secret commité (`.gitignore`)
- 🧑 Créer les 2 projets Vercel (Root Directory = frontend / backend), renseigner les variables
- 🧑 Validation juridique : CGV, mentions légales, politique de confidentialité, cookies (modèles fournis à faire relire) — voir D007

## Avant mise en production (checklist complète)
Voir `README.md` § « Checklist de mise en production ».
