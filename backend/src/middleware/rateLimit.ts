import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

/** Registre des buckets (état module, partagé entre instances d'app — voulu pour le serverless). */
const allBuckets = new Set<Map<string, Bucket>>();

/** TEST UNIQUEMENT : remet à zéro tous les limiteurs entre cas de test. */
export function resetAllRateLimits(): void {
  for (const buckets of allBuckets) buckets.clear();
}

/**
 * Minimal in-memory fixed-window rate limiter.
 * Note (serverless): state is per-instance; sufficient for auth abuse mitigation at launch.
 * Scale path documented in docs/SECURITY.md (Upstash/Redis) if traffic grows.
 */
export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  const buckets = new Map<string, Bucket>();
  allBuckets.add(buckets);
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
      // Opportunistic cleanup to avoid unbounded growth
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      }
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      next(new AppError(429, 'rate_limited', 'Trop de tentatives. Réessayez dans quelques minutes.'));
      return;
    }
    next();
  };
}
