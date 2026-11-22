import type { MetadataRoute } from 'next';
import { API_URL, SITE_URL } from '@/lib/constants';
import { isLaunch, isPreview } from '@/lib/config';

interface ProductRow {
  slug: string;
  updated_at?: string;
}

async function sitemapProducts(): Promise<{ data: ProductRow[] }> {
  const data: ProductRow[] = [];
  // L'API accepte 50 par page et expose au maximum 500 références actives.
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`${API_URL}/api/products?limit=50&page=${page}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!response.ok) break;
    const result = await response.json() as { data: ProductRow[]; total: number };
    data.push(...result.data);
    if (result.data.length < 50 || data.length >= result.total) break;
  }
  return { data };
}

/** Sitemap dynamique : pages fixes + catalogue réel depuis l'API. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreview()) return [];
  if (isLaunch()) return [{ url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 }];
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/collections`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ete`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/track-order`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/returns`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let categoryPages: MetadataRoute.Sitemap = [];
  let productPages: MetadataRoute.Sitemap = [];

  try {
    const [catsRes, productsRes] = await Promise.all([
      fetch(`${API_URL}/api/categories`, { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.json() : null)),
      sitemapProducts(),
    ]);
    if (catsRes?.data) {
      categoryPages = (catsRes.data as { slug: string }[]).map((c) => ({
        url: `${SITE_URL}/collections/${c.slug}`,
        changeFrequency: 'weekly',
        priority: 0.8,
        lastModified: now,
      }));
    }
    if (productsRes?.data) {
      productPages = (productsRes.data as ProductRow[]).map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
      }));
    }
  } catch {
    // API indisponible : le sitemap ne contient que les pages fixes (jamais d'URLs inventées)
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
