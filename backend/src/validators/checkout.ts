import { z } from 'zod';

/** Accepts '' as "absent" (common with HTML forms). */
function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);
}

export const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Adresse requise.').max(200),
  line2: emptyToUndefined(z.string().trim().max(200).optional()),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Code postal français invalide (5 chiffres).'),
  city: z.string().trim().min(1, 'Ville requise.').max(120),
  country: z.string().trim().length(2, 'Code pays invalide.').toUpperCase().default('FR'),
});

export const cartItemSchema = z.object({
  variantId: z.string().uuid('variantId invalide.'),
  quantity: z.number().int().min(1, 'Quantité minimale : 1.').max(20, 'Quantité maximale par article : 20.'),
});

export const shippingMethodSchema = z.enum(['standard', 'express']);

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Le panier est vide.').max(50, 'Trop d’articles différents.'),
  discountCode: emptyToUndefined(z.string().trim().max(32).optional()),
  shippingMethod: shippingMethodSchema.default('standard'),
  customer: z.object({
    email: z.string().trim().toLowerCase().email('Email invalide.'),
    firstName: z.string().trim().min(1, 'Prénom requis.').max(80),
    lastName: z.string().trim().min(1, 'Nom requis.').max(80),
    phone: emptyToUndefined(
      z
        .string()
        .trim()
        .max(30)
        .regex(/^[+0-9 ().-]+$/, 'Numéro de téléphone invalide.')
        .optional()
    ),
    address: addressSchema,
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const validateDiscountSchema = z.object({
  code: z.string().trim().min(2).max(32),
  subtotalCents: z.number().int().min(0).max(1_000_000_00),
});

export const abandonedCartSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  items: z.array(cartItemSchema).min(1).max(50),
});

export const orderLookupSchema = z.object({
  number: z.string().trim().min(3).max(40),
  email: z.string().trim().toLowerCase().email('Email invalide.'),
});
