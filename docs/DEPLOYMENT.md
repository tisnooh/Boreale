# DEPLOYMENT.md — Déploiement Vercel ×2 + Supabase + Stripe + Resend

Objectif atteint par la structure : `git clone` → renseigner les `.env` → déployer `frontend/` et `backend/` comme **2 projets Vercel séparés**, sans restructurer.

## 0. Prérequis (comptes à créer — propriétaire)
| Service | Usage | Où |
|---|---|---|
| Supabase | Base Postgres + RLS | supabase.com |
| Vercel ×2 | frontend + backend | vercel.com |
| Stripe (TEST puis LIVE) | Paiements + webhooks | dashboard.stripe.com |
| Resend | Emails transactionnels + newsletter | resend.com |
| Domaine | `domain.com` + `api.domain.com` | registrar au choix |

## 1. Supabase
1. Nouveau projet (région **UE**, ex. `eu-west-3` Paris — RGPD).
2. SQL Editor → exécuter dans l'ordre :
   - `backend/supabase/migrations/0001_schema.sql`
   - `backend/supabase/migrations/0002_rls.sql`
   - `backend/supabase/seed.sql`
   (ou `supabase link` + `supabase db push` avec le CLI.)
3. Settings → API : noter `SUPABASE_URL`, `anon key`, `service_role key` (⚠️ secrète).
4. ⚠️ Ajuster les stocks du seed (`inventory.quantity`) dès réception du stock fournisseur réel.

## 2. Backend → Projet Vercel n°2
1. Vercel → **Add New Project** → importer le repo → **Root Directory : `backend`**.
2. Framework : *Other*. Build command : `npm run build` (ou défaut Vercel — la fonction `api/index.ts` est compilée par `@vercel/node`). Install : `npm install`.
3. Variables d'environnement (Production + Preview) :
   ```
   FRONTEND_URL=https://domain.com
   SUPABASE_URL=…  SUPABASE_ANON_KEY=…  SUPABASE_SERVICE_ROLE_KEY=…   # service-role : backend uniquement
   STRIPE_SECRET_KEY=sk_test_…        STRIPE_WEBHOOK_SECRET=whsec_…
   EMAIL_API_KEY=re_…                 EMAIL_FROM=BORÉALE <bonjour@domain.com>
   NOTIFY_EMAIL=commandes@domain.com
   JWT_SECRET=<openssl rand -hex 32>  CRON_SECRET=<openssl rand -hex 32>
   NODE_ENV=production  BRAND_NAME=BORÉALE  PUBLIC_SITE_URL=https://domain.com
   ```
4. Deployer. Vérifier `https://api.domain.com/api/health` → `"status":"ok"` et tous les services `configured`.
5. **Domaine** : Settings → Domains → ajouter `api.domain.com` (CNAME `cname.vercel-dns.com` chez le registrar).
6. **Cron** : `vercel.json` déclare déjà `/api/cron/abandoned-carts` hourly (plan Hobby : 1 cron daily max — ajuster la fréquence ou passer au plan Pro ; l'endpoint accepte aussi un appel manuel authentifié).

## 3. Frontend → Projet Vercel n°1
1. Vercel → **Add New Project** → même repo → **Root Directory : `frontend`**.
2. Framework : *Next.js* (détecté). Build par défaut.
3. Variables :
   ```
   NEXT_PUBLIC_API_URL=https://api.domain.com
   NEXT_PUBLIC_SITE_URL=https://domain.com
   ```
4. Deployer. **Domaines** : `domain.com` + `www.domain.com` → ce projet (www en redirect vers apex, géré par Vercel).

## 4. Stripe
1. Developers → Webhooks → **Add endpoint** : `https://api.domain.com/api/webhooks/stripe`, événements :
   `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, `payment_intent.payment_failed`.
2. Copier le **signing secret** (`whsec_…`) → variable `STRIPE_WEBHOOK_SECRET` du projet backend → redéployer.
3. Tester en TEST : carte `4242 4242 4242 4242`, date/CVC libres. Vérifier : commande `paid`, stock décrémenté, emails (si Resend configuré), page succès.
4. **Passage en LIVE (J-7 du lancement)** : basculer `STRIPE_SECRET_KEY` (sk_live), recréer le webhook live + nouveau `whsec`, tester un petit paiement réel puis le rembourser via l'admin.

## 5. Resend
1. Domains → ajouter `domain.com` → ajouter les enregistrements DNS **SPF (Return-Path) + DKIM** fournis.
2. API Keys → créer une clé → `EMAIL_API_KEY` côté backend.
3. `EMAIL_FROM` doit utiliser le domaine vérifié (`BORÉALE <bonjour@domain.com>`).
4. Test : inscription newsletter → l'email de bienvenue doit arriver. Sans clé, les emails sont loggés côté serveur et **rien n'est délivré** (comportement voulu, cf. DECISIONS D011).

## 6. Premier compte admin
```bash
cd backend && SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npm run admin:create -- admin@domain.com 'MotDePasseFort!' 'Prénom Nom' admin
```
Puis connexion sur `https://domain.com/admin/login`.

## 7. DNS récapitulatif
```
domain.com        A/ALIAS → Vercel (projet frontend)
www.domain.com    CNAME  → cname.vercel-dns.com (redirect vers apex)
api.domain.com    CNAME  → cname.vercel-dns.com (projet backend)
+ TXT/MX/CNAME SPF/DKIM Resend (fournis par Resend)
```

## 8. Après déploiement
- Google Search Console + Bing Webmaster Tools : ajouter `domain.com`, soumettre `/sitemap.xml`.
- Lancer la recette complète : `docs/QA_TEST_PLAN.md`.
- Vérifier les en-têtes : `curl -I https://api.domain.com/api/health` (CORS 403 sur origine inconnue, cookies `Secure`).

## Rollback / environnement de préproduction
- Vercel : chaque push génère une Preview ; promouvoir/rollback en un clic (Deployments → Promote/Inspect).
- Preview backend : penser à un webhook Stripe dédié (ou `stripe trigger` en CLI) et à `FRONTEND_URL` incluant l'URL preview du frontend pendant les tests.
- Base : ne jamais appliquer de migration destructive sans dump Supabase (Database → Backups / `pg_dump`).
