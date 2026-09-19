import type { CorsOptions } from 'cors';
import { config, isProduction } from '../config.js';

/**
 * CORS — strict allowlist (see spec: no wildcard on sensitive endpoints; we use no wildcard at all).
 * - Production: only origins listed in FRONTEND_URL (comma-separated).
 * - Development: FRONTEND_URL + any localhost port.
 * Credentials are enabled (httpOnly cookie auth).
 */
export function buildCorsOptions(): CorsOptions {
  const env = config();
  const allowed = env.FRONTEND_URL.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Allow same-origin/curl (no Origin header)
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      if (!isProduction() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origine non autorisée (${origin})`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}
