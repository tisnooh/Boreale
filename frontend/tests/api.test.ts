import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api, ApiError } from '@/lib/api';

function mockFetchOnce(status: number, body: unknown, okInit?: Partial<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
        ...okInit,
      })
    )
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('GET réussit et retourne le JSON', async () => {
    mockFetchOnce(200, { data: { ok: true } });
    const res = await api.get<{ data: { ok: boolean } }>('/api/health');
    expect(res.data.ok).toBe(true);
  });

  it('envoie credentials + Content-Type sur POST avec body', async () => {
    mockFetchOnce(201, { ok: true });
    await api.post('/api/newsletter', { email: 'a@b.fr' });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.fr' }));
  });

  it('erreur API → ApiError avec code/message du serveur', async () => {
    mockFetchOnce(409, { error: { code: 'insufficient_stock', message: 'Stock insuffisant.' } });
    await expect(api.post('/api/stripe/checkout', {})).rejects.toMatchObject({
      status: 409,
      code: 'insufficient_stock',
      message: 'Stock insuffisant.',
    });
  });

  it('erreur serveur sans enveloppe → message générique avec statut', async () => {
    mockFetchOnce(500, {});
    await expect(api.get('/api/nope')).rejects.toBeInstanceOf(ApiError);
  });

  it('réseau coupé → network_error (message actionnable, pas de faux succès)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(api.get('/api/health')).rejects.toMatchObject({ code: 'network_error', status: 0 });
  });

  it('throwOnError=false ne lève pas d’exception', async () => {
    mockFetchOnce(404, { error: { code: 'not_found', message: 'x' } });
    const res = await api.get('/api/x', { throwOnError: false });
    expect(res).toMatchObject({ error: { code: 'not_found' } });
  });
});
