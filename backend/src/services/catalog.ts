import type { ProductListQuery } from '../validators/catalog.js';
import type { ProductWithRelations } from '../repositories/catalog.js';
import { catalogRepo } from '../repositories/catalog.js';
import type { CategoryDTO, DbCategory, DbInventory, DbVariant, ProductDTO, VariantDTO } from '../types/index.js';

/* ---------- mappers (pure) ---------- */

function firstInventory(v: DbVariant & { inventory?: DbInventory | DbInventory[] | null }): DbInventory | null {
  const inv = v.inventory;
  if (Array.isArray(inv)) return inv[0] ?? null;
  return inv ?? null;
}

export function toVariantDTO(v: DbVariant & { inventory?: DbInventory | DbInventory[] | null }): VariantDTO {
  const inv = firstInventory(v);
  const quantity = inv?.quantity ?? 0;
  return {
    id: v.id,
    sku: v.sku,
    title: v.title,
    options: v.options ?? {},
    priceCents: v.price_cents,
    // compare_at is only exposed when it can be legally displayed (Omnibus — D007).
    // The admin is responsible for keeping it truthful; the frontend displays it as
    // « prix de référence » with the required transparency.
    compareAtPriceCents: v.compare_at_price_cents,
    inStock: quantity > 0,
    quantity,
    lowStock: inv ? quantity > 0 && quantity <= inv.low_stock_threshold : false,
  };
}

export function extractCategories(p: ProductWithRelations): DbCategory[] {
  const out: DbCategory[] = [];
  for (const pc of p.product_categories ?? []) {
    const cats = pc.categories;
    if (!cats) continue;
    if (Array.isArray(cats)) out.push(...cats);
    else out.push(cats);
  }
  return out;
}

export function toProductDTO(p: ProductWithRelations): ProductDTO {
  const variants = (p.product_variants ?? []).filter((v) => v.is_active);
  const variantDTOs = variants.map(toVariantDTO);
  const priceCents = variantDTOs.length > 0 ? Math.min(...variantDTOs.map((v) => v.priceCents)) : 0;
  const inStock = variantDTOs.some((v) => v.inStock);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    longDescription: p.long_description,
    type: p.type,
    season: p.season ?? 'winter',
    isFeatured: p.is_featured,
    imageUrl: p.image_url,
    images: p.images ?? [],
    badge: p.badge,
    tags: p.tags ?? [],
    bundleItems: p.bundle_items ?? [],
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    priceCents,
    variantCount: variantDTOs.length,
    inStock,
    categories: extractCategories(p).map((c) => ({ slug: c.slug, name: c.name })),
  };
}

export function toProductDetailDTO(p: ProductWithRelations): ProductDTO {
  const dto = toProductDTO(p);
  dto.variants = (p.product_variants ?? []).filter((v) => v.is_active).map(toVariantDTO);
  return dto;
}

export function toCategoryDTO(c: DbCategory, productCount?: number): CategoryDTO {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    imageUrl: c.image_url,
    season: c.season ?? 'winter',
    ...(productCount !== undefined ? { productCount } : {}),
  };
}

/* ---------- queries ---------- */

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export function matchesQuery(p: ProductWithRelations, q: ProductListQuery): boolean {
  if (q.type && p.type !== q.type) return false;
  if (q.season) {
    const s = p.season ?? 'winter';
    if (s !== q.season && s !== 'all-season') return false;
  }
  if (q.featured !== undefined && p.is_featured !== q.featured) return false;
  if (q.category) {
    const cats = extractCategories(p).map((c) => c.slug);
    if (!cats.includes(q.category)) return false;
  }
  if (q.q) {
    const needle = q.q.toLowerCase();
    const hay = [p.name, p.subtitle ?? '', p.description, ...(p.tags ?? [])].join(' ').toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function minPrice(p: ProductWithRelations): number {
  const prices = (p.product_variants ?? []).filter((v) => v.is_active).map((v) => v.price_cents);
  return prices.length > 0 ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
}

export function sortProducts(rows: ProductWithRelations[], sort: ProductListQuery['sort']): ProductWithRelations[] {
  const copy = [...rows];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => minPrice(a) - minPrice(b));
    case 'price_desc':
      return copy.sort((a, b) => minPrice(b) - minPrice(a));
    case 'newest':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'featured':
    default:
      return copy.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.position - b.position);
  }
}

export const catalogService = {
  async listProducts(query: ProductListQuery): Promise<Paginated<ProductDTO>> {
    const all = await catalogRepo.listActiveProducts();
    const filtered = sortProducts(
      all.filter((p) => matchesQuery(p, query)),
      query.sort
    );
    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    const page = filtered.slice(start, start + query.limit).map(toProductDTO);
    return { data: page, page: query.page, limit: query.limit, total };
  },

  async getProduct(slug: string): Promise<ProductDTO | null> {
    const p = await catalogRepo.getProductBySlug(slug);
    if (!p || !p.is_active) return null;
    const detail = toProductDetailDTO(p);
    // Related: same first category, excluding self, in stock first, max 4
    const cats = extractCategories(p).map((c) => c.slug);
    if (cats.length > 0) {
      const all = await catalogRepo.listActiveProducts();
      detail.related = all
        .filter((o) => o.id !== p.id && extractCategories(o).some((c) => cats.includes(c.slug)))
        .sort((a, b) => Number(toProductDTO(b).inStock) - Number(toProductDTO(a).inStock))
        .slice(0, 4)
        .map(toProductDTO);
    } else {
      detail.related = [];
    }
    return detail;
  },

  async listCategories(season?: 'winter' | 'summer' | 'all-season'): Promise<CategoryDTO[]> {
    const [allCategories, products] = await Promise.all([catalogRepo.listCategories(), catalogRepo.listActiveProducts()]);
    const categories = season ? allCategories.filter((c) => (c.season ?? 'winter') === season || (c.season ?? 'winter') === 'all-season') : allCategories;
    return categories.map((c) => {
      const count = products.filter((p) => p.type === 'product' && extractCategories(p).some((cat) => cat.slug === c.slug)).length;
      return toCategoryDTO(c, count);
    });
  },

  async listBundles(): Promise<ProductDTO[]> {
    const all = await catalogRepo.listActiveProducts();
    return all.filter((p) => p.type === 'bundle').map(toProductDetailDTO);
  },
};
