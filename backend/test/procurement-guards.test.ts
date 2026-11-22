import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from 'express';
import { catalogRepo } from '../src/repositories/catalog.js';
import { catalogService } from '../src/services/catalog.js';
import { catalogController } from '../src/controllers/health.js';
import { adminController } from '../src/controllers/admin.js';
import { productUpsertSchema, productListQuerySchema } from '../src/validators/catalog.js';
const id = '550e8400-e29b-41d4-a716-446655440001';
const base = { id, slug: 'test', name: 'Test', is_active: true, procurement_status: 'verified', type: 'bundle',
  description: 'Description', position: 0, created_at: '2026-11-14', product_categories: [], product_variants: [] };
const body = { slug: 'test', name: 'Test', description: 'Description test', variants: [{ id, sku: 'TEST', title: 'Test', priceCents: 100 }] };
function call(handler: RequestHandler, request: object) {
  return new Promise<unknown>((resolve, reject) => {
    const response = { json: resolve, status: () => response };
    handler(request as never, response as never, reject);
  });
}
afterEach(() => vi.restoreAllMocks());
describe('procurement catalog boundary', () => {
  it('filters unverified and absent qualification from public list, bundles and detail', async () => {
    const unsafe = [{ ...base, procurement_status: 'unverified' }, { ...base, procurement_status: undefined }];
    vi.spyOn(catalogRepo, 'listActiveProducts').mockResolvedValue([base, ...unsafe] as never);
    expect((await catalogService.listProducts(productListQuerySchema.parse({}))).data).toHaveLength(1);
    expect(await catalogService.listBundles()).toHaveLength(1);
    for (const product of unsafe) {
      vi.spyOn(catalogRepo, 'getProductBySlug').mockResolvedValue(product as never);
      expect(await catalogService.getProduct('test')).toBeNull();
    }
  });
  it('does not expose sourced metadata or unverified variants to restored carts', async () => {
    const rows = ['verified', 'unverified', undefined].map((status) => ({ id, sku: 'TEST', title: 'Test', is_active: true,
      price_cents: 100, products: { ...base, procurement_status: status, supplier_url: 'private' }, inventory: { quantity: 10 } }));
    vi.spyOn(catalogRepo, 'getVariantsByIds').mockResolvedValue(rows as never);
    const response = await call(catalogController.listVariants, { query: { ids: [id] } });
    expect(response).toMatchObject({ data: [{ id, inStock: true }] });
    expect((response as { data: unknown[] }).data).toHaveLength(1);
    expect(JSON.stringify(response)).not.toContain('supplier');
    expect(JSON.stringify(response)).not.toContain('procurement_status');
  });
});
describe('generic product admin boundary', () => {
  it('defaults product and variant to inactive', () => {
    const parsed = productUpsertSchema.parse(body);
    expect(parsed.isActive).toBe(false); expect(parsed.variants[0]!.isActive).toBe(false);
  });
  it.each(['unverified', undefined])('rejects activation for %s before any writes', async (procurement_status) => {
    vi.spyOn(catalogRepo, 'adminGetProductById').mockResolvedValue({ ...base, procurement_status } as never);
    const write = vi.spyOn(catalogRepo, 'adminUpdateProduct');
    await expect(call(adminController.updateProduct, { params: { id }, body: productUpsertSchema.parse({ ...body, isActive: true }) })).rejects.toMatchObject({ code: 'procurement_unverified' });
    expect(write).not.toHaveBeenCalled();
  });
  it('rejects generic creation of active variants', async () => {
    const write = vi.spyOn(catalogRepo, 'adminInsertProduct');
    await expect(call(adminController.createProduct, { body: productUpsertSchema.parse({ ...body, variants: [{ ...body.variants[0], isActive: true }] }) })).rejects.toMatchObject({ code: 'procurement_unverified' });
    expect(write).not.toHaveBeenCalled();
  });
  it.each(['updateProduct', 'deleteProduct'] as const)('locks sourced drafts for %s', async (method) => {
    vi.spyOn(catalogRepo, 'adminGetProductById').mockResolvedValue({ ...base, source_candidate_key: 'BOR-ALI-20261114-01' } as never);
    const update = vi.spyOn(catalogRepo, 'adminUpdateProduct'); const remove = vi.spyOn(catalogRepo, 'adminDeleteProduct');
    await expect(call(adminController[method], { params: { id }, query: { hard: '1' }, body: productUpsertSchema.parse(body) })).rejects.toMatchObject({ code: 'sourced_draft_readonly', details: { href: '/admin/sourcing/BOR-ALI-20261114-01' } });
    expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it('preserves existing inventory when stock is omitted', async () => {
    vi.spyOn(catalogRepo, 'adminGetProductById').mockResolvedValue({ ...base, product_variants: [{ id }] } as never);
    vi.spyOn(catalogRepo, 'adminUpdateProduct').mockResolvedValue(base as never);
    vi.spyOn(catalogRepo, 'adminReplaceCategories').mockResolvedValue(undefined);
    vi.spyOn(catalogRepo, 'adminUpsertVariant').mockResolvedValue({ id } as never);
    const inventory = vi.spyOn(catalogRepo, 'adminSetInventory').mockResolvedValue(undefined);
    await call(adminController.updateProduct, { params: { id }, body: productUpsertSchema.parse(body) });
    expect(inventory).not.toHaveBeenCalled();
  });
  it('propagates inventory errors instead of reporting successful product creation', async () => {
    vi.spyOn(catalogRepo, 'adminInsertProduct').mockResolvedValue(base as never);
    vi.spyOn(catalogRepo, 'adminReplaceCategories').mockResolvedValue(undefined);
    vi.spyOn(catalogRepo, 'adminUpsertVariant').mockResolvedValue({ id } as never);
    vi.spyOn(catalogRepo, 'adminSetInventory').mockRejectedValue(new Error('inventory failed'));
    await expect(call(adminController.createProduct, { body: productUpsertSchema.parse({ ...body, variants: [{ sku: 'NEW', title: 'New', priceCents: 100 }] }) })).rejects.toThrow('inventory failed');
  });
});
