import type { Metadata } from 'next';
import { BRAND, SITE_URL } from './constants';
import type { ProductDTO } from './types';

/** Helpers SEO — canonical/metadataBase systématiques (docs/SEO.md). */

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: BRAND.name,
      locale: 'fr_FR',
      title: `${opts.title} — ${BRAND.name}`,
      description: opts.description,
      images: [{ url: opts.image ?? `${SITE_URL}/og/og-default.jpg`, width: 1200, height: 630, alt: BRAND.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function productJsonLd(product: ProductDTO, imageUrl: string | null) {
  const offers = (product.variants ?? []).map((v) => ({
    '@type': 'Offer' as const,
    sku: v.sku,
    price: (v.priceCents / 100).toFixed(2),
    priceCurrency: 'EUR',
    availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: `${SITE_URL}/products/${product.slug}`,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${SITE_URL}${imageUrl}`) : undefined,
    sku: product.variants?.[0]?.sku,
    brand: { '@type': 'Brand', name: BRAND.name },
    offers: offers.length === 1 ? offers[0] : { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: (product.priceCents / 100).toFixed(2), offerCount: offers.length, offers },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    slogan: BRAND.slogan,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    // Pas de sameAs tant que les comptes sociaux réels n'existent pas (pas de liens fictifs).
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question' as const,
      name: f.q,
      acceptedAnswer: { '@type': 'Answer' as const, text: f.a },
    })),
  };
}
