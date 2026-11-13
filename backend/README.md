# BORÉALE — Backend (API)

API e-commerce serverless : Express sur Vercel Functions + Supabase (Postgres + RLS) + Stripe + Resend. Application **indépendante** : projet Vercel n°2 avec `Root Directory = backend`.

## Démarrage local
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
Le mode Supabase retourne les données d’identité validées par Auth pour `/api/me`, mais
bloque `PATCH /api/me` avec `profile_schema_pending` tant que le mapping et la migration
des relations ne sont pas vérifiés. Ne pas fabriquer une ligne `public.users` ni des mots
de passe pour contourner cette incompatibilité. Aucune migration distante n’est appliquée
par cette préparation ; la recette Auth/DB réelle reste nécessaire.

Contrats consultés : [signUp](https://supabase.com/docs/reference/javascript/auth-signup),
[getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession),
[signOut](https://supabase.com/docs/reference/javascript/auth-signout).

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
