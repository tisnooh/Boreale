import { z } from 'zod';

function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);
}

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .max(128, 'Mot de passe trop long.')
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre.')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
  firstName: z.string().trim().min(1, 'Prénom requis.').max(80).optional(),
  lastName: z.string().trim().min(1, 'Nom requis.').max(80).optional(),
  marketingOptin: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.').max(128),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.').max(128),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: emptyToUndefined(
    z
      .string()
      .trim()
      .max(30)
      .regex(/^[+0-9 ().-]*$/, 'Numéro de téléphone invalide.')
      .optional()
  ),
  marketingOptin: z.boolean().optional(),
});
