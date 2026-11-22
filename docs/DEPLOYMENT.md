# DEPLOYMENT.md — Déploiement Vercel ×2 + Supabase + Stripe + Resend

Préparation de deux applications séparées : `frontend/` et `backend/`. Ce document ne prouve aucun déploiement ni ouverture des ventes. Toute production requiert l’autorisation du propriétaire et la recette complète.

## 0. Prérequis (comptes à créer — propriétaire)
| Service | Usage | Où |
|---|---|---|
| Supabase | Base Postgres + RLS | supabase.com |
| Vercel ×2 | frontend + backend | vercel.com |
| Stripe (TEST puis LIVE) | Paiements + webhooks | dashboard.stripe.com |
| Resend | Emails transactionnels + newsletter | resend.com |
| Domaine | `domain.com` + `api.domain.com` | registrar au choix |

## 1. Supabase
1. Utiliser le projet BORÉALE existant `luojeyfznonjnacftxbm` (Paris). Ne pas créer de doublon.
2. Le schéma courant est déjà appliqué et journalisé ; comparer l’historique Supabase aux fichiers de `backend/supabase/bootstrap/migrations/` avant toute migration supplémentaire. Ne pas rejouer les migrations déjà appliquées.
3. **Ne pas exécuter les migrations legacy `0001`/`0002`/`0003` ni `backend/supabase/seed.sql`** sur ce projet : le seed contient des données de démonstration et des stocks fictifs.
4. Configurer les accès dans les variables sécurisées du backend. Le service role reste exclusivement serveur ; aucune clé secrète dans le chat ou Git. Garder les produits non qualifiés inactifs, sans inventaire vendable.

## 2. Backend → Projet Vercel n°2
1. Vercel → **Add New Project** → importer le repo → **Root Directory : `backend`**.
2. Framework : *Other*. Build command : `npm run build` (ou défaut Vercel — la fonction `api/index.ts` est compilée par `@vercel/node`). Install : `npm install`.
3. Variables d'environnement (Production + Preview) :
   ```
   FRONTEND_URL=https://domain.com
   SUPABASE_URL=…  SUPABASE_ANON_KEY=…  SUPABASE_SERVICE_ROLE_KEY=…   # service-role : backend uniquement
   STRIPE_SECRET_KEY=sk_test_…        STRIPE_WEBHOOK_SECRET=whsec_…
   STRIPE_ACCOUNT_ID=acct_1Uc6bxGLTNMkV9aW   STRIPE_MODE=test
   CHECKOUT_ENABLED=false   ORDER_EMAIL_MODE=off
   EMAIL_API_KEY=re_…                 EMAIL_FROM=BORÉALE <bonjour@domain.com>
   NOTIFY_EMAIL=commandes@domain.com
   JWT_SECRET=<openssl rand -hex 32>  CRON_SECRET=<openssl rand -hex 32>
   NODE_ENV=production  BRAND_NAME=BORÉALE  PUBLIC_SITE_URL=https://domain.com
   ```
4. Préparer une prévisualisation isolée après configuration sécurisée ; une réponse health configurée ne valide pas le paiement. Vérifier le compte/mode Stripe côté serveur, les signatures et le parcours complet. Ne pas activer les ventes sur ce seul contrôle.
5. **Domaine** : Settings → Domains → ajouter `api.domain.com` (CNAME `cname.vercel-dns.com` chez le registrar).
6. **Aucun cron automatique n’est déclaré.** La relance commerciale des paniers nécessite une validation séparée du consentement et de l’autorisation d’envoi. Le traitement des confirmations reste désactivé jusqu’à la recette prestataire ; ne pas activer de campagne en configurant simplement la clé email.

## 3. Frontend → Projet Vercel n°1
1. Réutiliser le projet Vercel `boreale` existant, racine `frontend`. L’alias public reste sur le déploiement en mode `launch` pendant la recette.
2. Framework : *Next.js* (détecté). Build par défaut.
3. Variables :
   ```
   NEXT_PUBLIC_SITE_MODE=live  # Préproduction connectée, avec URL et API de test
   NEXT_PUBLIC_API_URL=https://api.domain.com
   NEXT_PUBLIC_SITE_URL=https://domain.com
   ```
4. Deployer. **Domaines** : `domain.com` + `www.domain.com` → ce projet (www en redirect vers apex, géré par Vercel).

## 4. Stripe
1. Developers → Webhooks → **Add endpoint** : `https://api.domain.com/api/webhooks/stripe`, événements :
   `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, `payment_intent.payment_failed`.
2. Copier le **signing secret** (`whsec_…`) → variable `STRIPE_WEBHOOK_SECRET` du projet backend → redéployer.
3. Tester en TEST : carte `4242 4242 4242 4242`, date/CVC libres. Vérifier : commande `paid`, stock décrémenté, emails (si Resend configuré), page succès.
4. Après recette et autorisation explicite, préparer le compte et le webhook Stripe live. Garder `LIVE_CHECKOUT_APPROVED=false` et `CHECKOUT_ENABLED=false` jusqu’à l’ouverture commerciale approuvée.

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
- Pour les sessions client et admin, préférer des sous-domaines HTTPS du même domaine enregistré pour le frontend et l’API. Tester les cookies sur Safari avant l’ouverture.
- Base : ne jamais appliquer de migration destructive sans dump Supabase (Database → Backups / `pg_dump`).
