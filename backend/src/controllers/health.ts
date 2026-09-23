import type { Request, Response } from 'express';
import { config, features } from '../config.js';
import { catalogService } from '../services/catalog.js';
import { catalogRepo } from '../repositories/catalog.js';
import { settingsService } from '../services/settings.js';
import { asyncHandler } from '../lib/errors.js';
import { AppError } from '../lib/errors.js';

export const healthController = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    brand: config().BRAND_NAME,
    time: new Date().toISOString(),
    services: {
      database: features.database() ? 'configured' : 'missing_env',
      stripe: features.stripe() ? 'configured' : 'missing_env',
      stripeWebhook: features.stripeWebhook() ? 'configured' : 'missing_env',
      email: features.email() ? 'configured' : 'logs_only',
    },
  });
};

export const catalogController = {
  listProducts: asyncHandler(async (req: Request, res: Response) => {
    const result = await catalogService.listProducts(req.query as never);
    res.json(result);
  }),

  getProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await catalogService.getProduct(req.params.slug!);
    if (!product) throw AppError.notFound('product_not_found', 'Produit introuvable.');
    res.json({ data: product });
  }),

  listCategories: asyncHandler(async (req: Request, res: Response) => {
    const season = req.query.season as 'winter' | 'summer' | 'all-season' | undefined;
    res.json({ data: await catalogService.listCategories(season) });
  }),

  getCategory: asyncHandler(async (req: Request, res: Response) => {
    const categories = await catalogService.listCategories();
    const cat = categories.find((c) => c.slug === req.params.slug);
    if (!cat) throw AppError.notFound('category_not_found', 'Collection introuvable.');
    res.json({ data: cat });
  }),

  listBundles: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await catalogService.listBundles() });
  }),

  homepageSettings: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: await settingsService.getHomepage() });
  }),

  /**
   * GET /api/variants?ids=uuid,uuid — sert à la restauration de panier depuis un lien
   * email : renvoie prix/stock ACTUELS côté serveur (jamais ceux du lien).
   */
  listVariants: asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.query as unknown as { ids: string[] };
    const rows = await catalogRepo.getVariantsByIds(ids);
    const data = rows
      .filter((r) => r.products && r.products.is_active && r.is_active)
      .map((r) => ({
        id: r.id,
        sku: r.sku,
        title: r.title,
        priceCents: r.price_cents,
        inStock: (r.inventory?.quantity ?? 0) > 0,
        quantity: r.inventory?.quantity ?? 0,
        product: r.products ? { slug: r.products.slug, name: r.products.name, imageUrl: r.products.image_url } : null,
      }));
    res.json({ data });
  }),
};
