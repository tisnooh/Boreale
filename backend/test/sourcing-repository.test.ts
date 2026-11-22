import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/logger.js', () => ({ logger: { error: logError } }));
vi.mock('../src/lib/supabase.js', () => ({ db: () => ({ rpc, from }) }));
import { errorHandler } from '../src/middleware/validate.js';
import { sourcingRepo } from '../src/repositories/sourcing.js';
import type { SourcingCandidateInput } from '../src/validators/sourcing.js';
const input: SourcingCandidateInput = { candidateKey: 'BOR-ALI-20261114-01', title: 'Draft', supplierName: 'Supplier',
  supplierUrl: 'https://supplier.en.alibaba.com', sourcePlatform: 'alibaba', sourceProductId: '1601619873272',
  sourceUrl: 'https://www.alibaba.com/product-detail/test_123.html', observedAt: '2026-11-14',
  observedFacts: {}, missingEvidence: ['Stock'], notes: null };
const candidate = { id: 'candidate-1', candidate_key: input.candidateKey, product_id: 'product-1' };
const product = { id: 'product-1', source_candidate_key: input.candidateKey, is_active: false, procurement_status: 'unverified' };
beforeEach(() => vi.resetAllMocks());
describe('sourcing atomic repository contract', () => {
  it('delegates idempotence to exactly one RPC per save and preserves stable identities', async () => {
    rpc.mockResolvedValueOnce({ data: { candidate, product, created: true }, error: null })
      .mockResolvedValueOnce({ data: { candidate, product, created: false }, error: null });
    const first = await sourcingRepo.upsert(input); const second = await sourcingRepo.upsert(input);
    expect(first.created).toBe(true); expect(second.created).toBe(false);
    expect(second.product.id).toBe(first.product.id); expect(second.candidate.id).toBe(first.candidate.id);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, 'upsert_sourcing_candidate_draft', { p_candidate: input });
    expect(rpc).toHaveBeenNthCalledWith(2, 'upsert_sourcing_candidate_draft', { p_candidate: input });
    expect(from).not.toHaveBeenCalled();
  });
  it('fails closed without the RPC and never falls back to partial writes', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });
    await expect(sourcingRepo.upsert(input)).rejects.toMatchObject({ code: 'sourcing_save_failed' });
    expect(from).not.toHaveBeenCalled();
  });
  it('retains safe diagnostic codes while keeping private values out of logs and HTTP', async () => {
    const privateMessage = 'missing function with private token=secret and candidate BOR-ALI-20261114-01';
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: privateMessage, details: input, hint: 'private key' } });
    const error = await sourcingRepo.upsert(input).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 503, code: 'sourcing_save_failed' });
    expect(logError).toHaveBeenCalledWith('sourcing_rpc_failed', {
      operation: 'upsert_sourcing_candidate_draft', code: 'PGRST202', category: 'rpc_unavailable',
    });
    const json = vi.fn(); const status = vi.fn(() => ({ json }));
    errorHandler(error, {} as never, { status } as never, vi.fn());
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: { code: 'sourcing_save_failed', message: 'Enregistrement du candidat non confirmé.' } });
    expect(JSON.stringify(logError.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(json.mock.calls)).not.toContain('PGRST202');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(input.candidateKey);
    expect(rpc).toHaveBeenCalledTimes(1); expect(from).not.toHaveBeenCalled();
  });
  it('does not log an unrecognized diagnostic string', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'secret-token-value', message: 'private' } });
    await expect(sourcingRepo.upsert(input)).rejects.toMatchObject({ status: 503 });
    expect(logError).toHaveBeenCalledWith('sourcing_rpc_failed', {
      operation: 'upsert_sourcing_candidate_draft', code: 'unknown', category: 'database_error',
    });
    expect(from).not.toHaveBeenCalled();
  });
  it('maps immutable source conflicts', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'candidate_source_conflict' } });
    await expect(sourcingRepo.upsert(input)).rejects.toMatchObject({ status: 409, code: 'candidate_source_conflict' });
  });
  it.each([null, { candidate, product: { ...product, is_active: true }, created: true }, { candidate, product: { ...product, procurement_status: 'verified' }, created: true }])('rejects unconfirmed or unsafe RPC response', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(sourcingRepo.upsert(input)).rejects.toMatchObject({ code: 'sourcing_save_unconfirmed' });
  });
});
