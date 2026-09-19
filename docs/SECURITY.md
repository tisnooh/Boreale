# SECURITY.md — Modèle de sécurité

## Secrets
- **Aucun secret dans Git** : `.gitignore` couvre `.env*` des deux apps ; seuls `.env.example` (vides) sont commités.
- `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY` : **backend uniquement**. Le frontend n'a que `NEXT_PUBLIC_API_URL` (+ `NEXT_PUBLIC_SITE_URL` publique par nature).
- `JWT_SECRET` / `CRON_SECRET` : générés par le propriétaire (`openssl rand -hex 32`), jamais partagés entre environnements.

## Authentification & sessions
- Mots de passe : **scrypt** (N=16384, sel aléatoire 16 o, comparaison constante) — natif Node, aucune dépendance.
- Politique : ≥ 8 caractères + lettre + chiffre (validée Zod côté serveur et affichée côté client).
- JWT HS256 : user 30 j, admin 12 h ; cookies **httpOnly**, `Secure` + `SameSite=None` en production (cross-site api.domain.com ↔ domain.com), `Lax` en dev.
- Anti-énumération : message d'erreur unique email/mot de passe ; rate-limit login user (20/15 min/IP) et admin (10/15 min/IP).
- Admin séparé des clients (table `admin_users`, rôle dans le token) ; création uniquement par script serveur.

## Autorisations
- `GET /api/orders/:id` : owner (user_id ou email du token) ou admin, sinon 403.
- Suivi invité : numéro de commande **ET** email exact requis (pas d'énumération par id).
- Toutes les routes `/api/admin/*` derrière `requireAdmin` ; transitions de statut de commande validées par matrice (D020).
- RLS Postgres activée partout ; en accès direct (clé anon), seule la lecture du catalogue actif est possible (voir DATABASE.md).

## Paiement (Stripe)
- Le client n'envoie **jamais** de prix : `variantId + quantity` uniquement ; prix, remises, livraison recalculés serveur (écart ⇒ 409/422).
- Webhook : corps brut + vérification signature `constructEventAsync` ; handlers **idempotents** (statut déjà avancé ⇒ no-op) ; l'oversell est journalisé, jamais bloquant pour une commande payée.
- Remboursements : admin only, montant plafonné au remboursable restant, confirmation explicite, audit via `order_events` + webhook `charge.refunded`.
- Sessions Checkout : expiration 30 min, `allow_promotion_codes: false` (les remises sont les nôtres, validées serveur), adresse de facturation collectée par Stripe.

## Entrées & sorties
- **Zod sur 100 % des entrées** (body et query) : types, bornes (qty ≤ 20, limit ≤ 50…), formats (email, code postal FR, slugs), normalisations (emails minuscules, codes promo majuscules).
- Erreurs normalisées `{error:{code,message,details}}` — jamais de stack trace au client ; logs structurés côté serveur.
- Headers : `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex` (API) ; TLS par Vercel.
- CORS allowlist stricte (aucun wildcard), `credentials: true` uniquement pour les origines connues.

## Données personnelles (RGPD)
- Minimisation : pas de collecte superflue, téléphone optionnel, pas de comptes sociaux imposés.
- Cookies : uniquement fonctionnels (panier local, session httpOnly) — pas de bandeau requis ; aucun tracker tiers au lancement (à revalider si analytics ajoutés).
- Durées de conservation documentées dans `/legal/privacy` ; désinscription newsletter par lien signé HMAC (pas de désinscription d'arbitraire).
- Suppression de compte : à câbler (endpoint dédié) avant collecte à volume — piste V2 documentée dans QA_TEST_PLAN.

## Infra & limites connues (assumées, documentées)
- Rate-limit **en mémoire** : efficace mono-instance ; passer à Upstash Redis si multi-instances/trafic (fichier `middleware/rateLimit.ts`).
- Pas de WAF custom : celui de Vercel + CORS + validation couvrent le lancement.
- Backups Supabase : activer PITR selon le plan (voir DEPLOYMENT.md).
- Monitoring d'erreurs : hook prévu dans `app/error.tsx` (brancher Sentry/Vercel Logs au choix du propriétaire).

## Checklist sécurité avant lancement
1. `JWT_SECRET` et `CRON_SECRET` uniques et forts (prod).
2. Clés Stripe LIVE + webhook LIVE configurés, TEST retirés.
3. Vérifier : cookie `Secure` posé, CORS 403 sur origine inconnue, `/api/admin/*` refusé sans session.
4. Compte admin créé hors repo ; pas d'admin par défaut.
5. Supabase : RLS activée (script de vérification : toutes les tables `relrowsecurity = true`), service-role jamais exposée.
6. Test de remboursement réel (petit montant) puis re-remboursement impossible.
7. Revue des logs Vercel après 48 h (429/500 anormaux).
