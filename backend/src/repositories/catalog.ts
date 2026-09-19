import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../lib/supabase.js';
import type { DbCategory, DbInventory, DbProduct, DbVariant, ProductType } from '../types/index.js';

export interface ProductWithRelations extends DbProduct {
  product_categories?: { categories: DbCategory | DbCategory[] | null }[] | null;
  product_variants?: (DbVariant & { inventory?: DbInventory | DbInventory[] | null })[] | null;
}

const PRODUCT_SELECT = '*, product_categories(categories(*)), product_variants(*,inventory(*))';

function client(): SupabaseClient {
  return db();
}

export const catalogRepo = {
  async listCategories(): Promise<DbCategory[]> {
    const { data, error } = await client()
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DbCategory[];
  },

  async getCategoryBySlug(slug: string): Promise<DbCategory | null> {
    const { data, error } = await client().from('categories').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
    if (error) throw error;
    return (data as DbCategory) ?? null;
  },

  /**
   * Small-catalog strategy (≤ ~500 products): fetch active products with relations,
   * then filter/sort/paginate in memory. Reliable, avoids fragile nested PostgREST filters.
   * Documented in docs/DATABASE.md (scale path: RPC/search view beyond 500 products).
   */
  async listActiveProducts(): Promise<ProductWithRelations[]> {
    const { data, error } = await client()
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as ProductWithRelations[];
  },

  async getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
    const { data, error } = await client()
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return (data as ProductWithRelations) ?? null;
  },

  async getVariantById(variantId: string): Promise<(DbVariant & { products: DbProduct | null; inventory: DbInventory | null }) | null> {
    const { data, error } = await client()
      .from('product_variants')
      .select('*, products(*), inventory(*)')
      .eq('id', variantId)
      .maybeSingle();
    if (error) throw error;
    return data as never;
  },

  async getVariantsByIds(ids: string[]): Promise<(DbVariant & { products: DbProduct | null; inventory: DbInventory | null })[]> {
    if (ids.length === 0) return [];
    const { data, error } = await client()
      .from('product_variants')
      .select('*, products(*), inventory(*)')
      .in('id', ids);
    if (error) throw error;
    return (data ?? []) as never;
  },

  /** Atomic stock decrement via SQL function (fails with 'insufficient_stock' when not enough). */
  async decrementInventory(variantId: string, qty: number): Promise<number> {
    const { data, error } = await client().rpc('decrement_inventory', { p_variant: variantId, p_qty: qty });
    if (error) throw error;
    return data as number;
  },

  async restoreInventory(variantId: string, qty: number): Promise<void> {
    const { error } = await client().rpc('increment_inventory', { p_variant: variantId, p_qty: qty });
    if (error) throw error;
  },

  /* ---------- admin ---------- */

  async adminGetProductById(id: string): Promise<ProductWithRelations | null> {
    const { data, error } = await client().from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as ProductWithRelations) ?? null;
  },

  async adminListProducts(): Promise<ProductWithRelations[]> {
    const { data, error } = await client()
      .from('products')
      .select(PRODUCT_SELECT)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as ProductWithRelations[];
  },

  async adminInsertProduct(row: Partial<DbProduct>): Promise<DbProduct> {
    const { data, error } = await client().from('products').insert(row).select().single();
    if (error) throw error;
    return data as DbProduct;
  },

  async adminUpdateProduct(id: string, patch: Partial<DbProduct>): Promise<DbProduct> {
    const { data, error } = await client().from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data as DbProduct;
  },

  async adminDeleteProduct(id: string): Promise<void> {
    const { error } = await client().from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async adminReplaceCategories(productId: string, categorySlugs: string[]): Promise<void> {
    const c = client();
    await c.from('product_categories').delete().eq('product_id', productId);
    if (categorySlugs.length === 0) return;
    const { data: cats, error } = await c.from('categories').select('id').in('slug', categorySlugs);
    if (error) throw error;
    const rows = (cats ?? []).map((cat) => ({ product_id: productId, category_id: cat.id as string }));
    if (rows.length > 0) {
      const { error: insErr } = await c.from('product_categories').insert(rows);
      if (insErr) throw insErr;
    }
  },

  async adminUpsertVariant(productId: string, v: Partial<DbVariant> & { id?: string }): Promise<DbVariant> {
    const c = client();
    const { id, ...rest } = v;
    if (id) {
      const { data, error } = await c.from('product_variants').update(rest).eq('id', id).eq('product_id', productId).select().single();
      if (error) throw error;
      return data as DbVariant;
    }
    const { data, error } = await c.from('product_variants').insert({ ...rest, product_id: productId }).select().single();
    if (error) throw error;
    return data as DbVariant;
  },

  async adminDeleteVariant(id: string): Promise<void> {
    const { error } = await client().from('product_variants').delete().eq('id', id);
    if (error) throw error;
  },

  async adminSetInventory(variantId: string, quantity: number, lowStockThreshold?: number): Promise<void> {
    const c = client();
    const { data: existing } = await c.from('inventory').select('variant_id').eq('variant_id', variantId).maybeSingle();
    const row: Partial<DbInventory> = { variant_id: variantId, quantity, updated_at: new Date().toISOString() } as Partial<DbInventory>;
    if (lowStockThreshold !== undefined) row.low_stock_threshold = lowStockThreshold;
    if (existing) {
      const { error } = await c.from('inventory').update(row).eq('variant_id', variantId);
      if (error) throw error;
    } else {
      const { error } = await c.from('inventory').insert({ variant_id: variantId, quantity, low_stock_threshold: lowStockThreshold ?? 5 });
      if (error) throw error;
    }
  },

  async adminListLowStock(): Promise<(DbVariant & { products: Pick<DbProduct, 'name' | 'slug'>; inventory: DbInventory })[]> {
    const { data, error } = await client()
      .from('product_variants')
      .select('*, products(name,slug), inventory(*)')
      .order('sku', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as unknown as (DbVariant & { products: never; inventory: DbInventory | DbInventory[] | null })[];
    return rows.filter((r) => {
      const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
      return inv != null && inv.quantity <= inv.low_stock_threshold;
    }) as never;
  },

  async adminCreateCategory(input: { slug: string; name: string; tagline?: string | null; description?: string | null; imageUrl?: string | null; position?: number }): Promise<DbCategory> {
    const { data, error } = await client()
      .from('categories')
      .insert({
        slug: input.slug,
        name: input.name,
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        image_url: input.imageUrl ?? null,
        position: input.position ?? 0,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as DbCategory;
  },

  async adminListAllCategories(): Promise<DbCategory[]> {
    const { data, error } = await client().from('categories').select('*').order('position', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DbCategory[];
  },

  async adminProductCountByType(): Promise<{ products: number; bundles: number }> {
    const { data, error } = await client().from('products').select('type');
    if (error) throw error;
    const rows = (data ?? []) as { type: ProductType }[];
    return {
      products: rows.filter((r) => r.type === 'product').length,
      bundles: rows.filter((r) => r.type === 'bundle').length,
    };
  },
};
