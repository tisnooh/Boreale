import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('BORÉALE <bonjour@localhost>'),
  NOTIFY_EMAIL: z.string().optional(),
  JWT_SECRET: z.string().default('dev-only-insecure-secret-change-me'),
  CRON_SECRET: z.string().default('dev-cron-secret'),
  BRAND_NAME: z.string().default('BORÉALE'),
  PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Fail fast with a readable message instead of a cryptic runtime error.
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  const env = parsed.data;
  // Normalize FRONTEND_URL: drop trailing slash
  env.FRONTEND_URL = env.FRONTEND_URL.replace(/\/+$/, '');
  return env;
}

/** Singleton for runtime use. Tests should call loadEnv() directly. */
let cached: Env | null = null;
export function config(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

export const isProduction = () => config().NODE_ENV === 'production';

/** Feature flags derived from env — used to answer 503 "not configured" instead of faking success. */
export const features = {
  database: () => Boolean(config().SUPABASE_URL && config().SUPABASE_SERVICE_ROLE_KEY),
  stripe: () => Boolean(config().STRIPE_SECRET_KEY),
  stripeWebhook: () => Boolean(config().STRIPE_SECRET_KEY && config().STRIPE_WEBHOOK_SECRET),
  email: () => Boolean(config().EMAIL_API_KEY),
};
