-- =============================================================
-- BORÉALE — 0001_schema.sql
-- Schéma complet (Postgres / Supabase). Prix en centimes (integer).
-- Voir docs/DATABASE.md pour la documentation des relations.
-- =============================================================

create extension if not exists "pgcrypto";

-- Séquence pour les numéros de commande (BOR-YYYY-000001)
create sequence if not exists order_number_seq;

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================
-- Comptes & clients
-- =============================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  marketing_optin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  name text,
  role text not null default 'admin' check (role in ('admin','staff')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email text not null unique check (email = lower(email)),
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_user_id_key on customers(user_id) where user_id is not null;

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null default 'shipping' check (type in ('shipping','billing')),
  line1 text not null,
  line2 text,
  postal_code text not null,
  city text not null,
  country char(2) not null default 'FR',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_customer_idx on addresses(customer_id);

-- =============================================================
-- Catalogue
-- =============================================================

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  image_url text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text not null,
  long_description text,
  type text not null default 'product' check (type in ('product','bundle')),
  is_active boolean not null default true,
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
create index if not exists products_active_idx on products(is_active, position);
create index if not exists products_type_idx on products(type) where is_active;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  title text not null,
  options jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  weight_g integer,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists variants_product_idx on product_variants(product_id);

create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx on product_categories(category_id);

create table if not exists inventory (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5,
  updated_at timestamptz not null default now()
);

-- Décrémentation atomique (utilisée par le webhook paiement)
create or replace function decrement_inventory(p_variant uuid, p_qty integer)
returns integer language plpgsql security definer as $$
declare
  new_qty integer;
begin
  update inventory
     set quantity = quantity - p_qty, updated_at = now()
   where variant_id = p_variant and quantity >= p_qty
  returning quantity into new_qty;
  if new_qty is null then
    if not exists (select 1 from inventory where variant_id = p_variant) then
      raise exception 'inventory_missing';
    end if;
    raise exception 'insufficient_stock';
  end if;
  return new_qty;
end $$;

create or replace function increment_inventory(p_variant uuid, p_qty integer)
returns integer language plpgsql security definer as $$
declare
  new_qty integer;
begin
  update inventory
     set quantity = quantity + p_qty, updated_at = now()
   where variant_id = p_variant
  returning quantity into new_qty;
  if new_qty is null then
    insert into inventory (variant_id, quantity) values (p_variant, p_qty)
    returning quantity into new_qty;
  end if;
  return new_qty;
end $$;

-- =============================================================
-- Commandes & paiements
-- =============================================================

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default (
    'BOR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 6, '0')
  ),
  customer_id uuid not null references customers(id) on delete restrict,
  user_id uuid references users(id) on delete set null,
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
create index if not exists orders_email_idx on orders(email);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_user_idx on orders(user_id) where user_id is not null;
create index if not exists orders_placed_idx on orders(placed_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete restrict,
  sku text not null,
  product_name text not null,
  variant_title text,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  total_cents integer not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'stripe',
  stripe_payment_intent_id text,
  stripe_session_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR',
  status text not null default 'pending' check (status in
    ('pending','succeeded','failed','refunded','partially_refunded')),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on payments(order_id);
create index if not exists payments_intent_idx on payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);

-- =============================================================
-- Marketing
-- =============================================================

create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type text not null check (type in ('percentage','fixed')),
  value integer not null check (value > 0), -- percentage: 1..100 — fixed: centimes
  min_subtotal_cents integer not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  source text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  items jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','sent','converted','expired')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists abandoned_carts_open_email_idx on abandoned_carts(email) where status = 'open';

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  order_number text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Triggers updated_at
drop trigger if exists users_updated on users;
create trigger users_updated before update on users for each row execute function set_updated_at();
drop trigger if exists profiles_updated on profiles;
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();
drop trigger if exists products_updated on products;
create trigger products_updated before update on products for each row execute function set_updated_at();
drop trigger if exists orders_updated on orders;
create trigger orders_updated before update on orders for each row execute function set_updated_at();
drop trigger if exists payments_updated on payments;
create trigger payments_updated before update on payments for each row execute function set_updated_at();
drop trigger if exists inventory_updated on inventory;
create trigger inventory_updated before update on inventory for each row execute function set_updated_at();
drop trigger if exists abandoned_updated on abandoned_carts;
create trigger abandoned_updated before update on abandoned_carts for each row execute function set_updated_at();
drop trigger if exists settings_updated on site_settings;
create trigger settings_updated before update on site_settings for each row execute function set_updated_at();
