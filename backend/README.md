# BORÉALE — Backend (API)

API e-commerce serverless : Express sur Vercel Functions + Supabase (Postgres + RLS) + Stripe + Resend. Application **indépendante** : projet Vercel n°2 avec `Root Directory = backend`.

## Démarrage local

Le projet Boréale créé utilise Supabase Auth (`AUTH_PROVIDER=supabase`) et le bootstrap séparé
`supabase/bootstrap/migrations/20261113193043_boreale_initial_auth.sql`. Ne pas lui appliquer
en plus la chaîne legacy ni son seed. Les accès locaux sont dans `.env.local`, ignoré par Git.
`npm run dev` et `npm start` chargent ce fichier avant l'application (Node20.12+ requis pour
ce chargement natif) ; les variables déjà définies par l'environnement gardent priorité.

Recettes réelles sans email ni paiement :

```bash
node --env-file=.env.local scripts/verify-supabase-bootstrap.mjs
# Avec npm start actif dans un autre terminal :
node --env-file=.env.local scripts/verify-boreale-auth-http.mjs
```

Ces scripts sont limités à la référence Boréale et créent puis suppriment uniquement leurs
comptes QA identifiés. Ils ne constituent pas un test de commande Stripe ou de fulfillment.

La migration additive suivante est `supabase/bootstrap/migrations/20261114033519_boreale_order_payment_atomic.sql`,
appliquée au même projet après revue. Elle ajoute les RPC commande/règlement/annulation et les journaux privés.
La recette `node --env-file=.env.local scripts/verify-order-transactions.mjs` utilise des produits inactifs et
des événements de paiement **synthétiques**. Elle laisse un fichier SQL de nettoyage hors dépôt : son exécution
par un administrateur est obligatoire après chaque run, car les journaux sont volontairement sans droit DELETE
pour le backend. Ne pas lancer cette recette sans prendre en charge ce nettoyage. Le contrôle SQL
`scripts/verify-create-order-rollback.sql` ne laisse aucune ligne et peut avancer la séquence de numérotation.
Voir `../docs/BOREALE_TRANSACTION_DELIVERY.md` pour les preuves et limites.

```bash
cp .env.example .env.local
# renseigner au minimum : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, FRONTEND_URL
npm install
npm run admin:create -- admin@votre-domaine.fr 'MotDePasseFort!'   # 1er compte admin
npm run dev        # http://localhost:4000  (tsx watch)
```

Stripe en local :
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
# → copier le whsec_... dans STRIPE_WEBHOOK_SECRET
```

Sans variables, l'API répond quand même : `/api/health` détaille honnêtement ce qui est
configuré ou manquant, et les endpoints dépendants renvoient `503 service non configuré`
(jamais de faux succès).

## Scripts
### Préparation Supabase Auth (opt-in, non activée par défaut)

`AUTH_PROVIDER=supabase` et `SUPABASE_PUBLISHABLE_KEY` activent les comptes clients Supabase
avec un client public séparé par opération. Le mode `legacy` demeure le défaut ; les admins
ne sont pas migrés. Aucun JWT client maison n’est accepté en mode Supabase.

L’accès est vérifié par `getUser` côté serveur. Access token et refresh token restent dans
des cookies httpOnly ; le refresh est borné à `/api/auth`. `POST /api/auth/refresh` effectue
la rotation explicite : `frontend/lib/api.ts` l’appelle après un 401 sur `/api/me`, ses sous-routes
et les détails `/api/orders/:id`, puis rejoue une seule fois. Les refresh concurrents et les
401 tardifs sont dédupliqués. Les routes admin/auth, le suivi invité et le checkout ne sont
pas rejoués. Aucun retry réseau/5xx ; un refresh refusé exige une reconnexion. Les tests
mockés ne remplacent pas la validation navigateur et prestataire réels.

Si la confirmation email est requise, une inscription sans session renvoie
`email_confirmation_required` ; elle ne crée pas une connexion fictive.
Le logout efface toujours les cookies et expose `remoteRevoked:false` si la révocation
distante n’a pas pu être confirmée. Les access tokens déjà émis peuvent rester valides
jusqu’à expiration : ne pas revendiquer une invalidation JWT instantanée.

La table `profiles` du schéma historique référence `public.users`, pas `auth.users`.
Le mode Supabase requiert le nouveau schéma compatible `profiles.user_id → auth.users.id`,
un profil initialisé par le trigger Auth validé et des politiques SELECT/UPDATE propriétaire
avec contrôle `USING` et `WITH CHECK`. Le rôle `authenticated` doit pouvoir lire les colonnes
profil et modifier uniquement prénom, nom, téléphone et préférence marketing.

`GET/PATCH /api/me` utilise un client Data API séparé par opération, avec la clé publishable
et le JWT du client vérifié côté serveur ; aucune clé service-role n’intervient pour le profil.
Chaque requête filtre `user_id` sur l’identité validée. Le payload ne peut changer ni
propriétaire ni rôle. Les noms et préférences de `/api/me` viennent du profil en base,
pas d’un fallback silencieux aux métadonnées. Les réponses d’inscription avec session,
de connexion et de refresh relisent également ce profil avec le nouveau JWT : un changement
de nom ou de préférence n’est pas annulé visuellement par d’anciennes métadonnées Auth.
Un profil absent, un schéma incompatible,
une erreur RLS ou un UPDATE ne renvoyant aucune ligne donne `profile_unavailable` (503),
jamais un faux succès. Une session Auth créée ou renouvelée dont le profil est indisponible
n’est pas annoncée comme connectée ; après échec du refresh, les cookies sont effacés et
une reconnexion sera nécessaire. Aucun upsert ni utilisateur legacy artificiel n’est créé.

Cette préparation locale n’applique aucune migration distante ; la recette DB/RLS réelle
reste nécessaire après revue et application du schéma initial. Ne pas activer ces routes
sur une base legacy sans migration étudiée ni présenter les tests mockés comme preuve RLS.

Contrats consultés : [signUp](https://supabase.com/docs/reference/javascript/auth-signup),
[getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession),
[signOut](https://supabase.com/docs/reference/javascript/auth-signout).
Profils/RLS : [gestion des utilisateurs](https://supabase.com/docs/guides/auth/managing-user-data),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

| Script | Rôle |
|---|---|
| `npm run dev` | serveur local (port 4000) |
| `npm run build` | compilation TypeScript → `dist/` |
| `npm run typecheck` / `lint` / `test` | qualité (Vitest : 60 tests, logique métier pure + webhook/checkout avec dépendances injectées) |
| `npm run admin:create -- email mdp [nom] [admin\|staff]` | crée/réinitialise un compte admin (scrypt) |

## Architecture
```
api/index.ts        # point d'entrée Vercel (export default app Express)
src/
├── app.ts          # composition : CORS, cookies, raw-body webhook, routes, erreurs
├── routes/index.ts # table de routage complète (voir docs/API.md)
├── controllers/    # fins : valident, appellent les services, répondent
├── services/       # logique métier (pricing pur, checkout, webhooks, auth, email, stats, settings)
├── repositories/   # accès Supabase (service-role)
├── middleware/     # auth JWT (user/admin), CORS strict, rate-limit, validation Zod, erreurs, headers
├── validators/     # schémas Zod (toutes les entrées)
├── lib/            # config env (Zod), erreurs, jwt, password (scrypt), money, logger, clients supabase/stripe
└── types/          # DTO + formes de lignes DB
supabase/
├── migrations/     # 0001_schema.sql, 0002_rls.sql
└── seed.sql        # catalogue de lancement (14 produits + 4 packs)
```

## Règles de sécurité clés (détail : ../docs/SECURITY.md)
- `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY` : **backend uniquement**, jamais exposés.
- Prix/stocks/remises **recalculés côté serveur** à chaque checkout — le client n'envoie que `variantId + quantity`.
- Webhook Stripe : corps brut + vérification de signature obligatoire.
- CORS : allowlist stricte (`FRONTEND_URL` en prod, localhost en dev), `credentials: true`, jamais `*`.
- Auth : JWT HS256 dans cookies httpOnly (`SameSite=None; Secure` en prod), scrypt pour les mots de passe, rate-limit sur login.
- RLS activée sur toutes les tables ; accès direct anon limité à la lecture du catalogue.

## Déploiement Vercel
Voir `../docs/DEPLOYMENT.md`. Résumé : projet Vercel avec Root Directory `backend`,
variables d'env du `.env.example`, domaine `api.domain.com`. `vercel.json` contient la
rewrite catch-all vers la fonction Express et le cron hourly des paniers abandonnés.
