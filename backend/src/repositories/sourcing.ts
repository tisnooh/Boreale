import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { db } from '../lib/supabase.js';
import type { DbProduct } from '../types/index.js';
import type { SourcingCandidateInput } from '../validators/sourcing.js';

export interface SourcingCandidateRow {
  id: string;
  candidate_key: string;
  product_id: string;
  title: string;
  supplier_name: string;
  supplier_url: string;
  source_platform: 'alibaba';
  source_product_id: string;
  source_url: string;
  observed_at: string;
  observed_facts: Record<string, unknown>;
  missing_evidence: string[];
  notes: string | null;
  status: 'unverified';
  created_at: string;
  updated_at: string;
  products?: Pick<DbProduct, 'id' | 'slug' | 'name' | 'is_active' | 'procurement_status' | 'source_candidate_key'> | null;
}
export interface SourcingDraftResult { candidate: SourcingCandidateRow; product: DbProduct; created: boolean }
const SELECT = '*, products(id,slug,name,is_active,procurement_status,source_candidate_key)';
export const sourcingRepo = {
  async list(): Promise<SourcingCandidateRow[]> {
    const { data, error } = await db().from('sourcing_candidates').select(SELECT).order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return (data ?? []) as SourcingCandidateRow[];
  },
  async get(key: string): Promise<SourcingCandidateRow | null> {
    const { data, error } = await db().from('sourcing_candidates').select(SELECT).eq('candidate_key', key).maybeSingle();
    if (error) throw error;
    return data as SourcingCandidateRow | null;
  },
  async upsert(input: SourcingCandidateInput): Promise<SourcingDraftResult> {
    const { data, error } = await db().rpc('upsert_sourcing_candidate_draft', { p_candidate: input });
    if (error) {
      if (error.message?.includes('candidate_source_conflict')) throw AppError.conflict('candidate_source_conflict', 'La provenance de ce candidat ne peut pas changer.');
      // Postgres messages/details may embed private row values. Log only an
      // allowlisted diagnostic code and a static category, never the raw error.
      const code = typeof error.code === 'string' && /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(error.code)
        ? error.code : 'unknown';
      const category = code === 'PGRST202' ? 'rpc_unavailable' : code === '42501' ? 'access_denied'
        : code.startsWith('23') ? 'constraint_violation' : 'database_error';
      logger.error('sourcing_rpc_failed', { operation: 'upsert_sourcing_candidate_draft', code, category });
      throw AppError.serviceUnavailable('sourcing_save_failed', 'Enregistrement du candidat non confirmé.');
    }
    const result = data as SourcingDraftResult | null;
    if (!result?.candidate || !result.product || typeof result.created !== 'boolean' ||
        result.candidate.candidate_key !== input.candidateKey || result.product.source_candidate_key !== input.candidateKey ||
        result.product.is_active !== false || result.product.procurement_status !== 'unverified') {
      throw AppError.serviceUnavailable('sourcing_save_unconfirmed', 'Brouillon inactif non confirmé.');
    }
    return result;
  },
};
