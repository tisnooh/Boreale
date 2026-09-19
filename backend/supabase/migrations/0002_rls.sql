-- =============================================================
-- BORÉALE — 0002_rls.sql
-- Row Level Security : activée sur TOUTES les tables.
--
-- Modèle d'accès (voir docs/DATABASE.md et DECISIONS.md D004/D013) :
--  * Le backend utilise la clé SERVICE_ROLE (bypass RLS) et applique ses
--    propres règles d'autorisation (JWT, ownership, rôles admin).
--  * Accès direct depuis le frontend (clé anon, si un jour utilisée) :
--    LECTURE SEULE du catalogue public + homepage settings.
--  * Tout le reste (commandes, clients, users, paiements…) : AUCUNE policy
--    ⇒ refus par défaut pour anon/authenticated.
-- =============================================================

alter table users enable row level security;
alter table profiles enable row level security;
alter table admin_users enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_categories enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table order_events enable row level security;
alter table discounts enable row level security;
alter table newsletter_subscribers enable row level security;
alter table newsletter_campaigns enable row level security;
alter table abandoned_carts enable row level security;
alter table contact_messages enable row level security;
alter table site_settings enable row level security;

-- ---------- Policies publiques (lecture catalogue uniquement) ----------

drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists variants_public_read on product_variants;
create policy variants_public_read on product_variants
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists product_categories_public_read on product_categories;
create policy product_categories_public_read on product_categories
  for select to anon, authenticated
  using (true);

drop policy if exists inventory_public_read on inventory;
create policy inventory_public_read on inventory
  for select to anon, authenticated
  using (true);

drop policy if exists settings_public_read on site_settings;
create policy settings_public_read on site_settings
  for select to anon, authenticated
  using (key = 'homepage');

-- ---------- Tables sans policy (accès service-role uniquement) ----------
-- users, profiles, admin_users, customers, addresses, orders, order_items,
-- payments, order_events, discounts, newsletter_subscribers,
-- newsletter_campaigns, abandoned_carts, contact_messages :
-- RLS activée, aucune policy ⇒ SELECT/INSERT/UPDATE/DELETE refusés
-- pour anon et authenticated. Seul le rôle service_role (backend) y accède.
