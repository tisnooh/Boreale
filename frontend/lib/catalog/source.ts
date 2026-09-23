/**
 * Source de données catalogue côté serveur (Server Components).
 *
 * - mode "preview" : données de démonstration locales (lib/catalog/preview-data.ts),
 *   zéro appel réseau → le site est validable visuellement sans infrastructure.
 * - mode "live"    : API backend réelle (GET /api/products, /api/categories, /api/bundles,
 *   /api/settings/homepage). Si l'API est injoignable : listes vides + homepage fallback,
 *   jamais de données inventées.
 *
 * Les composants UI ignorent la provenance : brancher la vraie base = passer
 * NEXT_PUBLIC_SITE_MODE=live, sans réécrire un seul composant.
 */
import { apiGetServer } from '@/lib/api-server';
import { isPreview, SITE_MODE, type SiteMode } from '@/lib/config';
import type { CategoryDTO, HomepageSettings, Paginated, ProductDTO } from '@/lib/types';
import { HOMEPAGE_FALLBACK } from '@/lib/homepage-fallback';
import { PREVIEW_CATEGORIES, PREVIEW_HOMEPAGE, PREVIEW_PRODUCTS } from './preview-data';
import { SUMMER_CATEGORIES, SUMMER_HOMEPAGE } from '@/lib/season/content-summer';
import { matchesShopSeason, type ShopSeason } from '@/lib/season/types';

export interface CatalogSource {
  mode: SiteMode;
  isPreview: boolean;
  products(season?: ShopSeason): Promise<ProductDTO[]>;
  product(slug: string): Promise<ProductDTO | null>;
  categories(season?: ShopSeason): Promise<CategoryDTO[]>;
  bundles(season?: ShopSeason): Promise<ProductDTO[]>;
  homepage(season?: ShopSeason): Promise<HomepageSettings>;
}

/* ---------- implémentation preview (locale) ---------- */

function withRelated(p: ProductDTO, all: ProductDTO[]): ProductDTO {
  const cats = p.categories.map((c) => c.slug);
  return {
    ...p,
    related: all
      .filter((o) => o.id !== p.id && o.categories.some((c) => cats.includes(c.slug)))
      .slice(0, 4),
  };
}

const ALL_PREVIEW_CATEGORIES = [...PREVIEW_CATEGORIES, ...SUMMER_CATEGORIES];

const previewSource: CatalogSource = {
  mode: 'preview',
  isPreview: true,
  async products(season) {
    const all = PREVIEW_PRODUCTS.map((p) => ({ ...p }));
    return season ? all.filter((p) => matchesShopSeason(p.season ?? 'winter', season)) : all;
  },
  async product(slug) {
    const all = PREVIEW_PRODUCTS;
    const found = all.find((p) => p.slug === slug);
    return found ? withRelated({ ...found }, all) : null;
  },
  async categories(season) {
    const all = ALL_PREVIEW_CATEGORIES.map((c) => ({ ...c }));
    return season ? all.filter((c) => matchesShopSeason(c.season ?? 'winter', season)) : all;
  },
  async bundles(season) {
    const all = PREVIEW_PRODUCTS.filter((p) => p.type === 'bundle').map((p) => ({ ...p }));
    return season ? all.filter((p) => matchesShopSeason(p.season ?? 'winter', season)) : all;
  },
  async homepage(season) {
    return season === 'summer' ? SUMMER_HOMEPAGE : PREVIEW_HOMEPAGE;
  },
};

/* ---------- implémentation live (API réelle) ---------- */

const liveSource: CatalogSource = {
  mode: 'live',
  isPreview: false,
  async products(season) {
    const res = await apiGetServer<Paginated<ProductDTO>>(`/api/products?limit=50${season ? `&season=${season}` : ''}`);
    return res?.data ?? [];
  },
  async product(slug) {
    const res = await apiGetServer<{ data: ProductDTO }>(`/api/products/${encodeURIComponent(slug)}`);
    return res?.data ?? null;
  },
  async categories(season) {
    const res = await apiGetServer<{ data: CategoryDTO[] }>(`/api/categories${season ? `?season=${season}` : ''}`);
    return res?.data ?? [];
  },
  async bundles(season) {
    const res = await apiGetServer<{ data: ProductDTO[] }>(`/api/bundles${season ? `?season=${season}` : ''}`);
    return res?.data ?? [];
  },
  async homepage(season) {
    const key = season === 'summer' ? 'homepage-summer' : 'homepage';
    const res =
      season === 'summer'
        ? await apiGetServer<{ data: HomepageSettings }>(`/api/settings/${key}`)
        : await apiGetServer<{ data: HomepageSettings }>('/api/settings/homepage');
    if (season === 'summer') return res?.data ?? SUMMER_HOMEPAGE;
    return res?.data ?? HOMEPAGE_FALLBACK;
  },
};

export function getCatalogSource(): CatalogSource {
  return isPreview() ? previewSource : liveSource;
}

export { SITE_MODE };

/* ---------- filtres/tri partagés (indépendants de la source) ---------- */

export type CatalogSort = 'featured' | 'price_asc' | 'price_desc' | 'newest';

export function filterProducts(
  products: ProductDTO[],
  opts: { category?: string; type?: 'product' | 'bundle'; q?: string; featured?: boolean }
): ProductDTO[] {
  return products.filter((p) => {
    if (opts.type && p.type !== opts.type) return false;
    if (opts.featured !== undefined && p.isFeatured !== opts.featured) return false;
    if (opts.category && !p.categories.some((c) => c.slug === opts.category)) return false;
    if (opts.q) {
      const needle = opts.q.toLowerCase();
      const hay = [p.name, p.subtitle ?? '', p.description, ...p.tags].join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function sortProducts(products: ProductDTO[], sort: CatalogSort): ProductDTO[] {
  const copy = [...products];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.priceCents - b.priceCents);
    case 'price_desc':
      return copy.sort((a, b) => b.priceCents - a.priceCents);
    case 'newest':
      return copy.sort((a, b) => a.id.localeCompare(b.id));
    case 'featured':
    default:
      return copy.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.name.localeCompare(b.name));
  }
}
