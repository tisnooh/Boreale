/** Shared domain types (DTO + DB row shapes). The frontend has its own copy — apps are independent by design (DECISIONS.md D002). */

export type UUID = string;

export type ProductType = 'product' | 'bundle';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
export type ShippingMethod = 'standard' | 'express';

/* ---------- DB rows (snake_case, as stored in Postgres) ---------- */

export interface DbProduct {
  id: UUID;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  long_description: string | null;
  type: ProductType;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
  images: string[];
  badge: string | null;
  tags: string[];
  bundle_items: BundleItemRef[];
  seo_title: string | null;
  seo_description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BundleItemRef {
  sku: string;
  name: string;
  quantity: number;
}

export interface DbVariant {
  id: UUID;
  product_id: UUID;
  sku: string;
  title: string;
  options: Record<string, string>;
  price_cents: number;
  compare_at_price_cents: number | null;
  weight_g: number | null;
  is_active: boolean;
  position: number;
}

export interface DbInventory {
  variant_id: UUID;
  quantity: number;
  low_stock_threshold: number;
}

export interface DbCategory {
  id: UUID;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
}

export interface DbOrder {
  id: UUID;
  number: string;
  customer_id: UUID;
  user_id: UUID | null;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_method: ShippingMethod;
  discount_code: string | null;
  shipping_address: AddressSnapshot;
  stripe_session_id: string | null;
  notes: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  placed_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface AddressSnapshot {
  firstName: string;
  lastName: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

export interface DbOrderItem {
  id: UUID;
  order_id: UUID;
  variant_id: UUID | null;
  sku: string;
  product_name: string;
  variant_title: string | null;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
  image_url: string | null;
}

export interface DbDiscount {
  id: UUID;
  code: string; // stored uppercase
  type: 'percentage' | 'fixed';
  value: number; // percentage: 1..100 — fixed: cents
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  description: string | null;
}

export interface DbAdminUser {
  id: UUID;
  email: string;
  password_hash: string;
  name: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
  last_login_at: string | null;
}

/* ---------- Public DTOs (camelCase, returned by the API) ---------- */

export interface CategoryDTO {
  id: UUID;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
}

export interface VariantDTO {
  id: UUID;
  sku: string;
  title: string;
  options: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  inStock: boolean;
  quantity: number | null; // may be hidden for guests if configured; we expose it (small catalog)
  lowStock: boolean;
}

export interface ProductDTO {
  id: UUID;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  longDescription: string | null;
  type: ProductType;
  isFeatured: boolean;
  imageUrl: string | null;
  images: string[];
  badge: string | null;
  tags: string[];
  bundleItems: BundleItemRef[];
  seoTitle: string | null;
  seoDescription: string | null;
  priceCents: number; // min variant price
  variantCount: number;
  inStock: boolean;
  categories: { slug: string; name: string }[];
  variants?: VariantDTO[];
  related?: ProductDTO[];
}

export interface PricedItem {
  variantId: UUID;
  sku: string;
  productName: string;
  variantTitle: string | null;
  unitPriceCents: number;
  quantity: number;
  imageUrl: string | null;
}

export interface TotalsDTO {
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface OrderItemDTO {
  sku: string;
  productName: string;
  variantTitle: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  imageUrl: string | null;
}

export interface OrderDTO {
  id: UUID;
  number: string;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingMethod: ShippingMethod;
  discountCode: string | null;
  shippingAddress: AddressSnapshot;
  items: OrderItemDTO[];
  tracking: { carrier: string | null; number: string | null; url: string | null };
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface UserDTO {
  id: UUID;
  email: string;
  firstName: string | null;
  lastName: string | null;
  marketingOptin: boolean;
  createdAt: string;
}

export interface AdminUserDTO {
  id: UUID;
  email: string;
  name: string | null;
  role: 'admin' | 'staff';
}
