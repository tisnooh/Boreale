-- BORÉALE canonical bootstrap: EMPTY database only; never combine with legacy 0001/0002/0003.
-- Customer identity is owned by Supabase Auth. No customer passwords or catalogue seed.
-- Prepared locally using Supabase CLI 3.1.0 migration new; not applied by this file generator.
-- Preconditions: auth.users, auth.uid(), anon/authenticated/service_role provided by Supabase.
-- gen_random_uuid is built into supported Postgres; no extension installation required.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

-- =============================================================
-- BORÉALE — baseline adapted from legacy schema; not the legacy migration chain.
-- Schéma complet (Postgres / Supabase). Prix en centimes (integer).
-- Voir docs/DATABASE.md pour la documentation des relations.
-- =============================================================



-- Séquence pour les numéros de commande (BOR-YYYY-000001)
create sequence public.order_number_seq;

-- Trigger updated_at
create function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================
-- Comptes & clients
-- =============================================================

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  marketing_optin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  name text,
  role text not null default 'admin' check (role in ('admin','staff')),
  is_active boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null unique check (email = lower(email)),
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_user_id_key on public.customers(user_id) where user_id is not null;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null default 'shipping' check (type in ('shipping','billing')),
  line1 text not null,
  line2 text,
  postal_code text not null,
  city text not null,
  country char(2) not null default 'FR',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses(customer_id);

-- =============================================================
-- Catalogue
-- =============================================================

create table public.categories (
  season text not null default 'winter' check (season in ('winter', 'summer', 'all-season')),
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  image_url text,
  position integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  season text not null default 'winter' check (season in ('winter', 'summer', 'all-season')),
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text not null,
  long_description text,
  type text not null default 'product' check (type in ('product','bundle')),
  is_active boolean not null default false,
  is_featured boolean not null default false,
  image_url text,
  images jsonb not null default '[]'::jsonb,
  badge text,
  tags text[] not null default '{}'::text[],
  bundle_items jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_active_idx on public.products(is_active, position);
create index if not exists products_type_idx on public.products(type) where is_active;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  title text not null,
  options jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  weight_g integer,
  is_active boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists variants_product_idx on public.product_variants(product_id);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx on public.product_categories(category_id);

create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5,
  updated_at timestamptz not null default now()
);

-- Décrémentation atomique (utilisée par le webhook paiement)
create function public.decrement_inventory(p_variant uuid, p_qty integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  new_qty integer;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'invalid_quantity';
  end if;
  update public.inventory
     set quantity = quantity - p_qty, updated_at = now()
   where variant_id = p_variant and quantity >= p_qty
  returning quantity into new_qty;
  if new_qty is null then
    if not exists (select 1 from public.inventory where variant_id = p_variant) then
      raise exception 'inventory_missing';
    end if;
    raise exception 'insufficient_stock';
  end if;
  return new_qty;
end $$;

create function public.increment_inventory(p_variant uuid, p_qty integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  new_qty integer;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'invalid_quantity';
  end if;
  update public.inventory
     set quantity = quantity + p_qty, updated_at = now()
   where variant_id = p_variant
  returning quantity into new_qty;
  if new_qty is null then
    insert into public.inventory (variant_id, quantity) values (p_variant, p_qty)
    returning quantity into new_qty;
  end if;
  return new_qty;
end $$;

-- =============================================================
-- Commandes & paiements
-- =============================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default (
    'BOR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq'::regclass)::text, 6, '0')
  ),
  customer_id uuid not null references public.customers(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (email = lower(email)),
  status text not null default 'pending' check (status in
    ('pending','paid','processing','shipped','delivered','cancelled','partially_refunded','refunded')),
  currency char(3) not null default 'EUR',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  shipping_method text not null default 'standard' check (shipping_method in ('standard','express')),
  discount_code text,
  shipping_address jsonb not null,
  stripe_session_id text unique,
  notes text,
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_email_idx on public.orders(email);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_user_idx on public.orders(user_id) where user_id is not null;
create index if not exists orders_placed_idx on public.orders(placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete restrict,
  sku text not null,
  product_name text not null,
  variant_title text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  total_cents integer not null check (total_cents >= 0),
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'stripe',
  stripe_payment_intent_id text unique,
  stripe_session_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR',
  status text not null default 'pending' check (status in
    ('pending','succeeded','failed','refunded','partially_refunded')),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_intent_idx on public.payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);

-- =============================================================
-- Marketing
-- =============================================================

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type text not null check (type in ('percentage','fixed')),
  value integer not null check (value > 0), -- percentage: 1..100 — fixed: centimes
  min_subtotal_cents integer not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  source text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  items jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','sent','converted','expired')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists abandoned_carts_open_email_idx on public.abandoned_carts(email) where status = 'open';

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  order_number text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Triggers updated_at
drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists products_updated on public.products;
create trigger products_updated before update on public.products for each row execute function private.set_updated_at();
drop trigger if exists orders_updated on public.orders;
create trigger orders_updated before update on public.orders for each row execute function private.set_updated_at();
drop trigger if exists payments_updated on public.payments;
create trigger payments_updated before update on public.payments for each row execute function private.set_updated_at();
drop trigger if exists inventory_updated on public.inventory;
create trigger inventory_updated before update on public.inventory for each row execute function private.set_updated_at();
drop trigger if exists abandoned_updated on public.abandoned_carts;
create trigger abandoned_updated before update on public.abandoned_carts for each row execute function private.set_updated_at();
drop trigger if exists settings_updated on public.site_settings;
create trigger settings_updated before update on public.site_settings for each row execute function private.set_updated_at();

-- Explicit per-relation grants: no global grant on unrelated Supabase objects.
alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.profiles to service_role;
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.admin_users to service_role;
alter table public.customers enable row level security;
revoke all on table public.customers from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.customers to service_role;
alter table public.addresses enable row level security;
revoke all on table public.addresses from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.addresses to service_role;
alter table public.categories enable row level security;
revoke all on table public.categories from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.categories to service_role;
alter table public.products enable row level security;
revoke all on table public.products from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.products to service_role;
alter table public.product_variants enable row level security;
revoke all on table public.product_variants from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.product_variants to service_role;
alter table public.product_categories enable row level security;
revoke all on table public.product_categories from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.product_categories to service_role;
alter table public.inventory enable row level security;
revoke all on table public.inventory from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.inventory to service_role;
alter table public.orders enable row level security;
revoke all on table public.orders from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.orders to service_role;
alter table public.order_items enable row level security;
revoke all on table public.order_items from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.order_items to service_role;
alter table public.payments enable row level security;
revoke all on table public.payments from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.payments to service_role;
alter table public.order_events enable row level security;
revoke all on table public.order_events from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.order_events to service_role;
alter table public.discounts enable row level security;
revoke all on table public.discounts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.discounts to service_role;
alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.newsletter_subscribers to service_role;
alter table public.newsletter_campaigns enable row level security;
revoke all on table public.newsletter_campaigns from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.newsletter_campaigns to service_role;
alter table public.abandoned_carts enable row level security;
revoke all on table public.abandoned_carts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.abandoned_carts to service_role;
alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.contact_messages to service_role;
alter table public.site_settings enable row level security;
revoke all on table public.site_settings from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.site_settings to service_role;

revoke all on sequence public.order_number_seq, public.order_events_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.order_number_seq, public.order_events_id_seq to service_role;

-- Public catalogue includes only active rows and active parent relations.
grant select on public.categories, public.products, public.product_variants,
  public.product_categories, public.site_settings to anon, authenticated;
create policy categories_public_read on public.categories for select to anon, authenticated using (is_active);
create policy products_public_read on public.products for select to anon, authenticated using (is_active);
create policy variants_public_read on public.product_variants for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy product_categories_public_read on public.product_categories for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active)
     and exists (select 1 from public.categories c where c.id = category_id and c.is_active));
create policy settings_public_read on public.site_settings for select to anon, authenticated
  using (key in ('homepage', 'homepage-summer'));

-- Owner-only profile access; ownership/created_at cannot be changed by authenticated clients.
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, marketing_optin) on public.profiles to authenticated;
create policy profiles_owner_read on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_owner_update on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Private trigger is the sole SECURITY DEFINER function. Metadata is presentation only:
-- copy three allowlisted, typed profile fields; never roles, permissions or account linking.
create function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, first_name, last_name, marketing_optin)
  values (
    new.id,
    case when pg_catalog.jsonb_typeof(new.raw_user_meta_data -> 'first_name') = 'string'
      then pg_catalog.left(new.raw_user_meta_data ->> 'first_name', 80) else null end,
    case when pg_catalog.jsonb_typeof(new.raw_user_meta_data -> 'last_name') = 'string'
      then pg_catalog.left(new.raw_user_meta_data ->> 'last_name', 80) else null end,
    case when pg_catalog.jsonb_typeof(new.raw_user_meta_data -> 'marketing_optin') = 'boolean'
      then (new.raw_user_meta_data ->> 'marketing_optin')::boolean else false end
  );
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated, service_role;
create trigger boreale_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Inventory RPCs stay invoker functions, callable only by backend service_role.
revoke all on function public.decrement_inventory(uuid, integer), public.increment_inventory(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.decrement_inventory(uuid, integer), public.increment_inventory(uuid, integer)
  to service_role;
revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;

create index products_season_idx on public.products(season) where is_active;
create index categories_season_idx on public.categories(season) where is_active;
