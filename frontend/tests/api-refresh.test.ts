import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });
afterEach(() => vi.unstubAllGlobals());
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const denied = () => reply(401, { error: { code: 'auth_required', message: 'Connexion requise.' } });

describe('refresh customer API', () => {
  it('sur 401 refresh puis rejoue une seule fois en conservant méthode et body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(denied()).mockResolvedValueOnce(reply(200)).mockResolvedValueOnce(reply(200, { data: { firstName: 'Camille' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    expect(await api.patch('/api/me', { firstName: 'Camille' })).toEqual({ data: { firstName: 'Camille' } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/auth\/refresh$/);
    expect(fetchMock.mock.calls[1][1]).toEqual({ method: 'POST', credentials: 'include' });
    expect(fetchMock.mock.calls[2][1]).toEqual(fetchMock.mock.calls[0][1]);
  });
  it.each([401, 404, 500])('refresh %s conserve le 401 initial sans boucle ni replay', async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(denied()).mockResolvedValueOnce(reply(status));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get('/api/me/orders')).rejects.toMatchObject({ status: 401, code: 'auth_required' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('un deuxième 401 après refresh réussi ne relance aucune rotation', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(denied()).mockResolvedValueOnce(reply(200)).mockResolvedValueOnce(denied());
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get('/api/orders/order-id')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('deux requêtes concurrentes attendent une rotation unique', async () => {
    let releaseRefresh!: () => void;
    const waitRefresh = new Promise<void>((resolve) => { releaseRefresh = resolve; });
    let refreshed = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) {
        await waitRefresh; refreshed = true; return reply(200);
      }
      return refreshed ? reply(200, { data: url }) : denied();
    });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    const requests = Promise.all([api.get('/api/me'), api.get('/api/me/orders')]);
    await vi.waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1));
    releaseRefresh();
    expect(await requests).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
  it('un 401 tardif antérieur à la rotation réutilise son résultat', async () => {
    let late401!: (response: Response) => void;
    const lateResponse = new Promise<Response>((resolve) => { late401 = resolve; });
    let attempts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) return reply(200);
      attempts++;
      if (attempts === 1) return denied();
      if (attempts === 2) return lateResponse;
      return reply(200);
    });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    const first = api.get('/api/me'); const second = api.get('/api/me/orders');
    await first; late401(denied()); await second;
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1);
  });
  it.each(['/api/admin/orders', '/api/auth/login', '/api/auth/refresh', '/api/orders/lookup?number=x', '/api/stripe/checkout'])('ne refresh pas %s', async (path) => {
    const fetchMock = vi.fn(async () => denied()); vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get(path)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([403, 500, 503])('ne retry pas un statut %s', async (status) => {
    const fetchMock = vi.fn(async () => reply(status)); vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get('/api/me')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('ne retry pas une erreur réseau initiale', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('offline'); }); vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get('/api/me')).rejects.toMatchObject({ code: 'network_error' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('échec réseau refresh retourne le 401 et libère le single-flight', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(denied()).mockImplementationOnce(() => { throw new Error('offline'); })
      .mockResolvedValueOnce(denied()).mockResolvedValueOnce(reply(200)).mockResolvedValueOnce(reply(200));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 });
    await api.get('/api/me');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
