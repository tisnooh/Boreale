import { z } from 'zod';

export const productListQuerySchema = z.object({
  category: z.string().trim().max(80).optional(),
  type: z.enum(['product', 'bundle']).optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['featured', 'price_asc', 'price_desc', 'newest']).default('featured'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const variantsQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.split(',').map((x) => x.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0 && arr.length <= 50, 'Entre 1 et 50 identifiants.')
    .refine((arr) => arr.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)), 'Identifiants invalides.'),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Identifiant invalide.'),
});

/* ---------- Admin product management ---------- */

const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(2).max(64),
  title: z.string().trim().min(1).max(160),
  options: z.record(z.string().trim().max(60), z.string().trim().max(60)).default({}),
  priceCents: z.number().int().min(0).max(100_000_00),
  compareAtPriceCents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  weightG: z.number().int().min(0).max(100_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().min(0).optional().default(0),
});

export const productUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide (minuscules, chiffres, tirets).'),
  name: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(240).optional().nullable(),
  description: z.string().trim().min(10).max(5000),
  longDescription: z.string().trim().max(20000).optional().nullable(),
  type: z.enum(['product', 'bundle']).default('product'),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  images: z.array(z.string().trim().max(500)).max(10).optional().default([]),
  badge: z.string().trim().max(60).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  bundleItems: z
    .array(z.object({ sku: z.string().trim().min(1).max(64), name: z.string().trim().min(1).max(160), quantity: z.number().int().min(1).max(20) }))
    .max(20)
    .optional()
    .default([]),
  seoTitle: z.string().trim().max(120).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  position: z.number().int().min(0).optional().default(0),
  categories: z.array(z.string().trim().min(1).max(80)).max(6).optional().default([]), // category slugs
  variants: z.array(variantInputSchema).min(1, 'Au moins une variante est requise.').max(50),
});

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export const discountUpsertSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'Code invalide (lettres, chiffres, tirets).')
      .transform((c) => c.toUpperCase()),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().int().min(1),
    minSubtotalCents: z.number().int().min(0).default(0),
    maxUses: z.number().int().min(1).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    description: z.string().trim().max(240).optional().nullable(),
  })
  .refine((d) => (d.type === 'percentage' ? d.value <= 90 : d.value <= 100_000_00), {
    message: 'Valeur de remise hors limites (percentage ≤ 90, fixed ≤ 100 000 €).',
    path: ['value'],
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endsAt'],
  });

export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_refunded', 'refunded']),
  trackingCarrier: z.string().trim().max(80).optional().nullable(),
  trackingNumber: z.string().trim().max(120).optional().nullable(),
  trackingUrl: z.string().trim().max(500).optional().nullable(),
  notify: z.boolean().optional().default(true),
});

export const refundSchema = z.object({
  amountCents: z.number().int().min(1).max(100_000_00).optional(), // undefined = full refund
  reason: z.string().trim().max(500).optional().default('Remboursement'),
});

export const campaignSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  html: z.string().trim().min(10).max(200_000),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

export const settingsSchema = z.object({
  value: z.record(z.string(), z.unknown()),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  source: z.string().trim().max(60).optional().default('site'),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis.').max(120),
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10, 'Message trop court (10 caractères min).').max(5000),
  orderNumber: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).optional(),
});
