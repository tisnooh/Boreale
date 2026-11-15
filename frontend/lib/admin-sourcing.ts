import { ApiError } from '@/lib/api';

export interface SourcingCandidate {
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
  products: {
    id: string; slug: string; name: string; is_active: boolean;
    procurement_status?: 'unverified' | 'verified';
    source_candidate_key?: string | null;
  } | null;
}

export function sourcingError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.message} (${error.code})${error.details ? ` — ${JSON.stringify(error.details)}` : ''}`;
  }
  return error instanceof Error ? error.message : 'Erreur inattendue.';
}

export function isAlibabaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['alibaba.com', 'alibaba.co.uk'].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
