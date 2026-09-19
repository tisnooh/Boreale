# BORÉALE — winter-store

Marque e-commerce française spécialisée hiver (nom provisoire, voir `DECISIONS.md` D001).
Monorepo contenant **2 applications indépendantes** déployables séparément sur Vercel :

```
winter-store/
├── frontend/   # Next.js 15 (App Router) + TypeScript + Tailwind v4 — projet Vercel n°1 (Root Directory = frontend)
├── backend/    # API serverless TypeScript (Express sur Vercel Functions) + Supabase + Stripe + Resend — projet Vercel n°2 (Root Directory = backend)
├── docs/       # DATABASE.md, API.md, DEPLOYMENT.md, SEO.md, SECURITY.md, MARKETING.md, PRODUCT_RESEARCH.md, BRANDING.md, QA_TEST_PLAN.md
├── PLAN.md     # plan du projet
├── TASKS.md    # suivi d'exécution (✅ agent / 🧑 propriétaire)
├── DECISIONS.md# journal des décisions (ADR)
└── README.md
```

## Démarrage rapide (après `git clone`)

Prérequis : Node.js ≥ 20, un projet [Supabase](https://supabase.com), un compte [Stripe](https://stripe.com) (mode test), un compte [Resend](https://resend.com) (optionnel en dev).

### 1. Base de données
1. Créer un projet Supabase.
2. Exécuter dans l'ordre les fichiers de `backend/supabase/migrations/` (SQL Editor ou `supabase db push`).
3. Exécuter `backend/supabase/seed.sql` (catalogue de lancement : 14 produits, 4 bundles, catégories, contenus).

### 2. Backend
```bash
cd backend
cp .env.example .env.local   # renseigner SUPABASE_*, STRIPE_*, FRONTEND_URL, EMAIL_API_KEY, JWT_SECRET, CRON_SECRET
npm install
npm run admin:create -- admin@votre-domaine.fr 'MotDePasseFort!'   # premier compte admin
npm run dev                  # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

### 4. Stripe en local
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
# copier le webhook secret dans backend/.env.local (STRIPE_WEBHOOK_SECRET)
```

## Commandes (frontend et backend)
| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict sans émission |
| `npm run test` | Vitest |
| `npm run build` | build de production |

## Déploiement
Voir **`docs/DEPLOYMENT.md`** : 2 projets Vercel (Root Directory `frontend` et `backend`), domaine principal → frontend, `api.domain.com` → backend, webhook Stripe, cron, variables d'environnement.

## Ce qui fonctionne déjà (sans aucun compte externe)
- Frontend complet : toutes les pages, panier, checkout, compte, admin, SEO, responsive. En l'absence de backend, les pages catalogue affichent un état vide élégant (pas de fausses données).
- Backend complet : API REST, validation Zod, CORS strict, auth JWT, Stripe checkout/webhook/refunds, emails, admin, cron panier abandonné. Sans variables, `/api/health` répond et les endpoints dépendants retournent des erreurs claires (503 « service non configuré »), jamais de fausses réussites.
- Tests unitaires verts des deux côtés.

## Ce qui exige le propriétaire (résumé — détail dans TASKS.md)
1. **Identité/marque** : valider le nom BORÉALE (INPI + domaine), acheter le domaine.
2. **Comptes externes** : Supabase, Vercel ×2, Stripe, Resend (+ vérification domaine email), éventuellement transporteur réel.
3. **Clés** : renseigner les `.env` (jamais commités), créer le compte admin.
4. **Fournisseurs réels** : sourcing + devis + conformité des produits (aucun fournisseur n'est inventé dans ce projet).
5. **Juridique** : faire relire CGV/mentions/privacy/retours (modèles fournis), règles de prix barrés (Omnibus), étiquetage textile.
6. **Photos produits réelles** avant lancement (les visuels actuels sont des placeholders assumés, D016).

## Checklist exacte avant mise en production

### A. Comptes & infrastructure (🧑 propriétaire)
- [ ] 1. Domaine acheté ; DNS prêt (apex + www + api).
- [ ] 2. Projet Supabase (région UE) créé ; migrations 0001 + 0002 appliquées ; seed.sql exécuté.
- [ ] 3. Projet Vercel « backend » (Root Directory = `backend`) avec toutes les variables du `.env.example`.
- [ ] 4. Projet Vercel « frontend » (Root Directory = `frontend`) avec `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SITE_URL`.
- [ ] 5. Domaines attachés : `domain.com`/`www` → frontend ; `api.domain.com` → backend.
- [ ] 6. Compte Stripe : clés (TEST d'abord) + webhook `https://api.domain.com/api/webhooks/stripe` (5 événements, voir DEPLOYMENT.md §4) + `STRIPE_WEBHOOK_SECRET`.
- [ ] 7. Compte Resend : domaine vérifié (SPF/DKIM) + `EMAIL_API_KEY` + `EMAIL_FROM` sur le domaine réel.
- [ ] 8. `JWT_SECRET` et `CRON_SECRET` générés (`openssl rand -hex 32`) — uniques par environnement.
- [ ] 9. `npm run admin:create -- …` exécuté contre la base de production ; connexion `/admin/login` validée.

### B. Marque & catalogue (🧑)
- [ ] 10. Nom validé (INPI classes 25/24/12/35 + domaine) — sinon renommer (le nom est centralisé : `BRAND_NAME`, seed, logo).
- [ ] 11. Fournisseurs réels sourcés ; devis + échantillons reçus ; coûts réels saisis ; grille de prix recalculée dans l'admin.
- [ ] 12. Stocks réels saisis dans l'admin (remplacer les 60/variante du seed).
- [ ] 13. Vraies photos produits uploadées et URLs mises à jour (admin → Produits) ; visuels SVG provisoires retirés.
- [ ] 14. Étiquetage textile (composition, entretien, origine) conforme sur chaque fiche.

### C. Juridique (🧑 + juriste)
- [ ] 15. CGV, mentions légales, privacy, retours : crochets complétés (société, SIRET, TVA, médiateur de la consommation désigné) + relecture juridique.
- [ ] 16. Politique prix conforme Omnibus (aucun prix barré non justifié 30 jours).
- [ ] 17. Assurances/RC pro e-commerce souscrites ; CGU transporteur réel signé ; tarifs livraison ajustés (`SHIPPING_OPTIONS` backend + `SHIPPING` frontend).

### D. Validation technique (recette complète : docs/QA_TEST_PLAN.md §2-3)
- [ ] 18. `npm run lint && npm run typecheck && npm run test && npm run build` verts sur les 2 apps.
- [ ] 19. Commande Stripe TEST de bout en bout : paiement → webhook → emails → stock → admin → expédition → remboursement partiel/total.
- [ ] 20. Parcours invité + compte + suivi de commande + panier abandonné (cron) vérifiés.
- [ ] 21. Sécurité : CORS 403 origine inconnue, cookies Secure, routes admin 401 sans session, rate-limit 429, aucune clé service dans le bundle frontend.
- [ ] 22. Mobile (375 px) + desktop : toutes les pages, drawer panier, checkout, admin.
- [ ] 23. Lighthouse mobile ≥ 85 perf ; Search Console + sitemap soumis.
- [ ] 24. Emails réels reçus (7 templates) avec domaine vérifié ; lien de désinscription signé OK.

### E. Bascule LIVE (🧑, J-7 → J0)
- [ ] 25. Stripe LIVE : `sk_live` + webhook live + `whsec` live ; petit paiement réel testé puis remboursé.
- [ ] 26. Stocks finaux + codes promo de lancement activés/désactivés dans l'admin.
- [ ] 27. Contenu homepage final (hero, FAQ, annonces) via /admin/contenu.
- [ ] 28. Surveillance 48 h : logs Vercel, webhooks Stripe (page Developers → Webhooks → tentatives), délivrabilité Resend.

## Sécurité
Aucun secret dans Git. Clé Stripe privée et `SUPABASE_SERVICE_ROLE_KEY` uniquement côté backend. Détails : `docs/SECURITY.md`.

