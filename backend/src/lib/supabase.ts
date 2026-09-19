import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, features } from '../config.js';
import { AppError } from './errors.js';

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — BACKEND ONLY. Never expose this key to the frontend.
 * RLS still applies for the anon client; the service role bypasses RLS and the
 * application layer enforces permissions (auth middleware, ownership checks).
 */
export function db(): SupabaseClient {
  if (!features.database()) {
    throw AppError.serviceUnavailable(
      'database_not_configured',
      'Base de données non configurée (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants). Voir backend/.env.example.'
    );
  }
  if (!adminClient) {
    adminClient = createClient(config().SUPABASE_URL!, config().SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Reset cached client (used by tests). */
export function resetDbClient() {
  adminClient = null;
}
