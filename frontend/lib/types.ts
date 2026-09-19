/** DTO partagés frontend — miroir de l'API backend (apps indépendantes, duplication assumée). */

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
export type ShippingMethod = 'standard' | 'express';

export interface BundleItemRef {
  sku: string;
  name: string;
  quantity: number;
}

export interface VariantDTO {
  id: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  inStock: boolean;
  quantity: number | null;
  lowStock: boolean;
}

export interface ProductDTO {
  id: string;
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
  priceCents: number;
  variantCount: number;
  inStock: boolean;
  categories: { slug: string; name: string }[];
  variants?: VariantDTO[];
  related?: ProductDTO[];
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
}

export interface TotalsDTO {
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
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
  id: string;
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
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  marketingOptin: boolean;
  createdAt: string;
}

export interface HomepageSettings {
  announcementBar: string | null;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    image: string | null;
  };
  benefits: { icon: string; title: string; text: string }[];
  featuredProductSlugs: string[];
  bundleSlugs: string[];
  faq: { q: string; a: string }[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
