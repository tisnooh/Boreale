# API.md — Référence de l'API BORÉALE

Base URL : `NEXT_PUBLIC_API_URL` côté frontend (`http://localhost:4000` en dev, `https://api.domain.com` en prod).
Toutes les réponses sont JSON. Enveloppe de succès : `{ "data": ... }` (ou `{ data, page, limit, total }` pour les listes paginées). Enveloppe d'erreur : `{ "error": { "code", "message", "details?" } }`.

Auth client : cookie httpOnly `boreale_token` (JWT HS256, 30 j) ou header `Authorization: Bearer`. Auth admin : cookie `boreale_admin` (12 h). `credentials: 'include'` requis côté navigateur (CORS allowlist + credentials).

Codes d'erreur usuels : `validation_error` (422), `auth_required`/`invalid_credentials` (401), `not_your_order`/`admin_auth_required` (403), `*_not_found` (404), `insufficient_stock`/`product_unavailable`/`invalid_transition`/`discount_invalid` (409/422), `rate_limited` (429), `database_not_configured`/`stripe_not_configured`/`webhook_not_configured` (503), `invalid_signature` (400).

## Public — catalogue & contenu

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | État de l'API + services configurés (honnête : `configured`/`missing_env`/`logs_only`) |
| GET | `/api/products` | Liste paginée. Query : `category` (slug), `type=product\|bundle`, `featured=true\|false`, `q` (texte), `sort=featured\|price_asc\|price_desc\|newest`, `page`, `limit` (≤50). → `{data: ProductDTO[], page, limit, total}` |
| GET | `/api/products/:slug` | Détail : variantes + stocks + catégories + `related` (4 produits de la même collection) |
| GET | `/api/categories` | Collections actives avec `productCount` |
| GET | `/api/categories/:slug` | Une collection |
| GET | `/api/bundles` | Produits de type `bundle` (avec `bundleItems`) |
| GET | `/api/settings/homepage` | Contenu homepage piloté par l'admin (hero, bénéfices, slugs vedettes, FAQ) — defaults si absent |
| GET | `/api/variants?ids=uuid,…` | Prix/stock **actuels** de ≤ 50 variantes actives (+ slug/nom/image du produit). Sert à la restauration de panier depuis les emails (le lien ne contient jamais de prix) |

## Public — interactions

| Méthode | Route | Body | Description |
|---|---|---|---|
| POST | `/api/newsletter` | `{email, source?}` | Inscription (upsert ; renvoie `subscribed`/`unsubscribed`). Email de bienvenue réel via Resend si configuré. Rate-limit 12/h/IP |
| GET | `/api/newsletter/unsubscribe?email=&sig=` | — | Désinscription par lien signé HMAC (footer de tous les emails). Répond une page HTML de confirmation |
| POST | `/api/contact` | `{name, email, subject, message, orderNumber?}` | Enregistre + notifie `NOTIFY_EMAIL`. Rate-limit |
| POST | `/api/discounts/validate` | `{code, subtotalCents}` | → `{valid, discountCents, message}` (vérifie activité, dates, `max_uses`, minimum). Rate-limit |
| POST | `/api/carts/abandoned` | `{email, items:[{variantId, quantity}]}` | Enregistre le panier ouvert (1 seul par email). Utilisé par /checkout à la saisie de l'email |
| GET | `/api/orders/lookup?number=&email=` | — | Suivi invité : les DEUX champs doivent matcher. → `OrderDTO` |

## Compte client (cookie `boreale_token`)

| Méthode | Route | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, firstName?, lastName?, marketingOptin?}` | Crée user+profile, pose le cookie. Password ≥8 car. + lettre + chiffre (scrypt). Rate-limit 20/15 min/IP |
| POST | `/api/auth/login` | `{email, password}` | Même cookie. Erreur unique `invalid_credentials` (anti-énumération) |
| POST | `/api/auth/logout` | — | Efface le cookie |
| GET | `/api/me` | — | `UserDTO` du token courant |
| PATCH | `/api/me` | `{firstName?, lastName?, phone?, marketingOptin?}` | Mise à jour profil |
| GET | `/api/me/orders` | — | Commandes du compte (inclut les commandes invité passées avec le même email) |
| GET | `/api/orders/:id` | — | Détail — **owner ou admin uniquement** (sinon 403 `not_your_order`) |

## Checkout & Stripe

| Méthode | Route | Body | Description |
|---|---|---|---|
| POST | `/api/stripe/checkout` | `CheckoutInput` (ci-dessous) | **Recalcule prix/remise/livraison côté serveur**, vérifie les stocks, crée `order(pending)` + `order_items` + `payment(pending)`, crée la Checkout Session Stripe (`mode=payment`, expiration 30 min, locale fr) → `{url, orderId, orderNumber, totals}`. Le client est redirigé vers `url` |
| GET | `/api/stripe/session/:id` | — | Vérification page succès : `{paymentStatus, amountTotal, customerEmail, orderNumber}` (métadonnées uniquement, aucune donnée sensible) |
| POST | `/api/webhooks/stripe` | corps brut | Événements traités : `checkout.session.completed` (→ paid, stock décrémenté atomiquement, code promo consommé, panier abandonné converti, emails commande+reçu+notif admin), `checkout.session.expired` / `async_payment_failed` (→ cancelled), `charge.refunded` (→ refunded/partially_refunded + email), `payment_intent.payment_failed`. **Signature vérifiée** (`stripe-signature` + `STRIPE_WEBHOOK_SECRET`), idempotent (statut déjà traité ⇒ no-op) |

`CheckoutInput` (validé Zod) :
```jsonc
{
  "items": [{ "variantId": "uuid", "quantity": 1 }],   // 1..50 lignes, qty ≤ 20 — JAMAIS de prix
  "discountCode": "WELCOME10",                          // optionnel, validé serveur
  "shippingMethod": "standard",                         // standard | express
  "customer": {
    "email": "client@example.fr",
    "firstName": "Camille", "lastName": "Durand",
    "phone": "0612345678",                              // optionnel
    "address": { "line1": "12 rue de la Paix", "line2": null,
                 "postalCode": "75002", "city": "Paris", "country": "FR" }
  }
}
```

## Cron (Vercel)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/cron/abandoned-carts` | `Authorization: Bearer <CRON_SECRET>` | Paniers ouverts ≥ 3 h sans commande : 1 email de rappel (max 100/run), puis `sent`. Les emails ayant commandé depuis passent en `converted`. Configuré hourly dans `backend/vercel.json` |

## Admin (cookie `boreale_admin`, rôle admin/staff)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/admin/auth/login` | Login admin (rate-limit 10/15 min/IP) |
| POST | `/api/admin/auth/logout` · GET `/api/admin/auth/me` | Session |
| GET | `/api/admin/stats` | Dashboard : CA brut/net/30 j, remboursé, AOV, statuts, série 14 j, top produits, alertes stock, abonnés newsletter, commandes récentes — **agrégats réels depuis la DB** |
| GET/POST | `/api/admin/products` | Liste (avec variantes+stocks, actifs et inactifs) / création complète (produit + catégories + variantes + stocks) |
| PUT/DELETE | `/api/admin/products/:id` | Édition complète / désactivation douce (`?hard=1` = suppression physique, seulement sans commandes liées — FK restrict) |
| GET | `/api/admin/orders` | Paginé, filtres `status`, `q` (numéro/email) |
| GET | `/api/admin/orders/:id` | Détail + `events` + `payment` |
| POST | `/api/admin/orders/:id/status` | `{status, trackingCarrier?, trackingNumber?, trackingUrl?, notify?}` — transitions validées (D020), timestamps auto, email d'expédition si `shipped`, ré-incrémentation du stock si annulation d'une commande payée |
| POST | `/api/admin/orders/:id/refund` | `{amountCents?, reason?}` → `stripe.refunds.create` (partiel ou total). Statuts + email client synchronisés par le webhook `charge.refunded` |
| GET | `/api/admin/customers` | Paginé + `ordersCount`, `totalSpentCents` (commandes payées) |
| GET/POST/PUT/DELETE | `/api/admin/discounts[/:id]` | CRUD codes promo (percentage ≤ 90, fixed ≤ 100 000 €, dates cohérentes) |
| GET | `/api/admin/newsletter/subscribers` | Paginé, filtre `q`/`status` |
| POST | `/api/admin/newsletter/campaigns` | `{subject, html, limit≤1000}` → envoi réel via Resend (lien de désinscription signé injecté), campagne historisée (sent/failed) |
| GET/POST | `/api/admin/messages[/:id/handled]` | Messages contact |
| GET/PUT | `/api/admin/settings/homepage` | Contenu homepage (hero, bandeau, bénéfices, slugs vedettes/packs, FAQ) |
| GET | `/api/admin/settings/:key` | Autre réglage site |

## DTO principaux
`ProductDTO`, `VariantDTO` (avec `quantity`/`inStock`/`lowStock`), `CategoryDTO`, `OrderDTO` (+ `items`, `tracking`), `UserDTO`, `TotalsDTO` — définitions exactes : `backend/src/types/index.ts` et miroir `frontend/lib/types.ts`.

## CORS
- Prod : uniquement les origines de `FRONTEND_URL` (séparées par virgules). Dev : + `localhost`/`127.0.0.1` tous ports.
- `credentials: true`, méthodes GET/POST/PUT/PATCH/DELETE/OPTIONS, headers Content-Type/Authorization, preflight caché 600 s.
- Origine non autorisée → 403 `cors_rejected`. **Aucun wildcard**, y compris sur les endpoints publics.

## Exemples

```bash
# santé
curl http://localhost:4000/api/health

# catalogue
curl 'http://localhost:4000/api/products?category=chaleur&sort=price_asc'

# checkout (recalcule tout côté serveur)
curl -X POST http://localhost:4000/api/stripe/checkout \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"variantId":"<uuid>","quantity":1}],"shippingMethod":"standard",
       "customer":{"email":"c@x.fr","firstName":"C","lastName":"D",
       "address":{"line1":"1 rue","postalCode":"75001","city":"Paris","country":"FR"}}}'

# webhook local
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
