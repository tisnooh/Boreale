import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { sourcingCandidateSchema } from '../src/validators/sourcing.js';
import { sourcingRepo } from '../src/repositories/sourcing.js';
import { sourcingService } from '../src/services/sourcing.js';
import { createApp } from '../src/app.js';
import { signAdminToken, signUserToken } from '../src/lib/jwt.js';
import { adminUsersRepo } from '../src/repositories/users.js';

const input = { candidateKey: 'BOR-ALI-20261114-01', title: 'Candidat test', supplierName: 'Supplier test',
  supplierUrl: 'https://supplier.en.alibaba.com', sourcePlatform: 'alibaba' as const,
  sourceProductId: '1601619873272', sourceUrl: 'https://www.alibaba.com/product-detail/test_123456.html',
  observedAt: '2026-11-14', observedFacts: { title: 'Observed title' }, missingEvidence: ['Stock'], notes: null };
let server: http.Server;
let base: string;
beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
afterEach(() => vi.restoreAllMocks());

describe('private sourcing input', () => {
  const registry = JSON.parse(readFileSync(new URL('../../sourcing/alibaba-candidates.json', import.meta.url), 'utf8')) as { candidates: unknown[] };
  it.each(registry.candidates)('validates the original private candidate %# without changing provenance', (candidate) => {
    expect(sourcingCandidateSchema.parse(candidate)).toEqual(candidate);
  });
  it.each(['123', '123456789012345678901'])('rejects product identity outside SQL bounds %s', (sourceProductId) => {
    expect(sourcingCandidateSchema.safeParse({ ...input, sourceProductId }).success).toBe(false);
  });

  it('accepts the bounded dated evidence contract', () => expect(sourcingCandidateSchema.parse(input)).toEqual(input));
  it.each(['priceCents', 'stock', 'variants', 'isActive', 'productId', 'status', 'procurementStatus'])('rejects forged %s', (field) => {
    expect(sourcingCandidateSchema.safeParse({ ...input, [field]: true }).success).toBe(false);
  });
  it.each(['http://www.alibaba.com/a', 'https://alibaba.com.evil.invalid/a', 'https://evilalibaba.com/a', 'https://u:p@alibaba.com/a'])('rejects source URL %s', (sourceUrl) => {
    expect(sourcingCandidateSchema.safeParse({ ...input, sourceUrl }).success).toBe(false);
  });
  it.each(['2026-02-30', '2026-11-14T00:00:00Z'])('rejects invented or invalid date %s', (observedAt) => {
    expect(sourcingCandidateSchema.safeParse({ ...input, observedAt }).success).toBe(false);
  });
  it('bounds facts size and depth', () => {
    expect(sourcingCandidateSchema.safeParse({ ...input, observedFacts: { long: 'x'.repeat(20001) } }).success).toBe(false);
    expect(sourcingCandidateSchema.safeParse({ ...input, observedFacts: { a: { a: { a: { a: { a: { a: { a: {} } } } } } } } }).success).toBe(false);
  });
  it('rejects route/body identity mismatch before persistence', async () => {
    const save = vi.spyOn(sourcingRepo, 'upsert');
    await expect(sourcingService.upsert(input, 'BOR-ALI-20261114-02')).rejects.toMatchObject({ code: 'candidate_key_immutable' });
    expect(save).not.toHaveBeenCalled();
  });
});

describe('sourcing HTTP admin boundary', () => {
  it.each(['GET', 'POST', 'PUT'])('rejects anonymous and customer %s', async (method) => {
    const save = vi.spyOn(sourcingRepo, 'upsert');
    const list = vi.spyOn(sourcingRepo, 'list');
    const get = vi.spyOn(sourcingRepo, 'get');
    const path = method === 'PUT' ? `/api/admin/sourcing-candidates/${input.candidateKey}` : '/api/admin/sourcing-candidates';
    for (const token of [null, signUserToken({ sub: 'user', email: 'user@example.invalid' })]) {
      const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: JSON.stringify(input) } : {}) });
      expect(response.status).toBe(401);
    }
    expect(save).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(get).not.toHaveBeenCalled();
  });
  it('allows admin reads, validates writes and returns snakecase draft', async () => {
    vi.spyOn(adminUsersRepo, 'findById').mockResolvedValue({ id: 'admin', email: 'admin@example.invalid', role: 'admin', name: null, is_active: true });
    const row = { candidate_key: input.candidateKey, supplier_name: input.supplierName };
    vi.spyOn(sourcingRepo, 'list').mockResolvedValue([row] as never);
    const upsert = vi.spyOn(sourcingRepo, 'upsert').mockResolvedValue({ candidate: row, product: { is_active: false }, created: true } as never);
    const headers = { Authorization: `Bearer ${signAdminToken({ sub: 'admin', email: 'admin@example.invalid', role: 'admin' })}`, 'Content-Type': 'application/json' };
    const list = await fetch(base + '/api/admin/sourcing-candidates', { headers });
    expect(list.status).toBe(200); expect(await list.json()).toEqual({ data: [row] });
    const forged = await fetch(base + '/api/admin/sourcing-candidates', { method: 'POST', headers, body: JSON.stringify({ ...input, isActive: true }) });
    expect(forged.status).toBe(422); expect(upsert).not.toHaveBeenCalled();
    const saved = await fetch(base + '/api/admin/sourcing-candidates', { method: 'POST', headers, body: JSON.stringify(input) });
    expect(saved.status).toBe(201); expect(await saved.json()).toMatchObject({ data: { candidate: row, created: true } });
  });
});
