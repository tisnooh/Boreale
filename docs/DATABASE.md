# DATABASE.md — Schéma Supabase (Postgres)

Migrations : `backend/supabase/migrations/0001_schema.sql` (schéma), `0002_rls.sql` (RLS + policies).
Seed : `backend/supabase/seed.sql` (catalogue de lancement, idempotent).

**Convention** : prix en **centimes (integer)** — jamais de float (DECISIONS.md D013). Emails stockés en minuscules (contrainte `check (email = lower(email))`).

## Tables & relations

```
users 1──1 profiles                (comptes clients : email + hash scrypt)
users 1──* orders                  (user_id nullable : commande invité possible)
users 1──0..1 customers            (customers.user_id unique, nullable)
customers 1──* addresses           (expédition/facturation)
customers 1──* orders
categories *──* products           (via product_categories)
products 1──* product_variants     (sku unique, price_cents, options jsonb)
product_variants 1──1 inventory    (quantity, low_stock_threshold)
orders 1──* order_items            (snapshot : nom, sku, prix unitaire figés à l'achat)
orders 1──* payments               (Stripe : session_id, payment_intent, refunded_cents)
orders 1──* order_events           (journal d'audit horodaté)
discounts                          (codes promo : percentage/fixed, min_subtotal, max_uses, used_count)
newsletter_subscribers             (statut subscribed/unsubscribed, source)
newsletter_campaigns               (historique d'envois réels : sent/failed counts)
admin_users                        (back-office : rôles admin/staff — séparé des users)
abandoned_carts                    (email + items jsonb, statut open/sent/converted/expired)
contact_messages                   (formulaire /contact)
site_settings                      (clé/valeur jsonb — ex: contenu homepage piloté par l'admin)
```

Détails clés :
- `orders.number` : défaut SQL `BOR-<année>-<séquence 6 digits>` (séquence `order_number_seq`) → unique, lisible, triable.
- `orders.shipping_address` : **snapshot jsonb** de l'adresse au moment de l'achat (immuable même si le client déménage) ; `addresses` conserve l'historique client.
- `order_items` : snapshot des libellés/prix ; `variant_id` en FK `on delete restrict` (les variantes ne sont jamais supprimées physiquement, seulement désactivées — intégrité de l'historique).
- `products.bundle_items` : jsonb `[{sku, name, quantity}]` — les bundles sont des produits de type `bundle` avec leur propre SKU/stock (DECISIONS.md D014).
- `payments.refunded_cents` cumulé ; statut `refunded`/`partially_refunded` synchronisé par le webhook `charge.refunded`.

## Fonctions SQL
| Fonction | Rôle |
|---|---|
| `decrement_inventory(uuid, int)` | Décrémentation **atomique** du stock au paiement ; lève `insufficient_stock` sinon (security definer) |
| `increment_inventory(uuid, int)` | Ré-incrémentation (annulation d'une commande payée, retour) |
| `set_updated_at()` | Trigger `updated_at` sur 8 tables |

## Index
- `products(slug)` unique, `products(is_active, position)`, `products(type) where is_active`
- `product_variants(sku)` unique, `product_variants(product_id)`
- `orders(email)`, `orders(status)`, `orders(placed_at desc)`, `orders(user_id) where not null`, `orders(stripe_session_id)` unique
- `order_items(order_id)`, `payments(order_id)`, `payments(stripe_payment_intent_id) where not null`
- `order_events(order_id, created_at)`, `addresses(customer_id)`, `product_categories(category_id)`
- `abandoned_carts(email) where status='open'` (unique partiel : un seul panier ouvert par email)
- `users(email)`, `customers(email)`, `admin_users(email)`, `newsletter_subscribers(email)`, `discounts(code)` : contraintes `unique`

## RLS (Row Level Security)

**Activée sur les 20 tables.** Modèle (DECISIONS.md D004/D013) :

1. **Backend = clé service-role** → bypass RLS ; les permissions applicatives (JWT user/admin, ownership des commandes, rate-limit) sont appliquées dans le code API.
2. **Accès direct anon/authenticated (clé publique)** : LECTURE SEULE du catalogue :
   - `categories`, `products`, `product_variants` : `select` si `is_active = true`
   - `product_categories` : `select` (tout)
   - `inventory` : `select` (affichage « plus que X en stock »)
   - `site_settings` : `select` si `key = 'homepage'`
3. **Tout le reste** (users, profiles, admin_users, customers, addresses, orders, order_items, payments, order_events, discounts, newsletter_*, abandoned_carts, contact_messages) : **aucune policy ⇒ refus par défaut** pour anon/authenticated. Seule la service-role y accède, via l'API.

Conséquence : même si la clé anon fuit, aucune donnée personnelle ou commerciale n'est lisible ; le catalogue public reste servable en direct si besoin.

> Échelle : au-delà de ~500 produits, remplacer le filtrage en mémoire du service catalogue par une vue/RPC Postgres (documenté dans le code, `repositories/catalog.ts`).

## Seed (données de lancement)
`seed.sql` est **idempotent** (upserts sur slug/sku/code/key) :
- 4 catégories, 14 produits (+ descriptions FR longues, SEO), 4 bundles avec `bundle_items`
- 38 variantes (tailles/couleurs), stocks initiaux **placeholder = 60/variante** → ⚠️ à remplacer par le stock réel après sourcing fournisseur (TASKS.md)
- 2 codes promo (`WELCOME10` −10 % dès 20 €, `PACK10` −10 € dès 90 €) — désactivables dans l'admin
- Contenu homepage par défaut (`site_settings.homepage`)

Aucun utilisateur, aucun admin, aucun avis, aucune commande n'est seedé : les comptes admin se créent via `npm run admin:create` (jamais de mot de passe en dur dans le repo).
