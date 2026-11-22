import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('utilise uniquement les réponses API en mode connecté, même en cas de panne', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'live');
  vi.doMock('@/lib/catalog/preview-data', () => {
    throw new Error('Les données de démonstration ne doivent pas être chargées');
  });
  const apiGetServer = vi.fn().mockResolvedValue(null);
  vi.doMock('@/lib/api-server', () => ({ apiGetServer }));
  try {
    const { getCatalogSource } = await import('@/lib/catalog/source');
    const source = getCatalogSource();
    expect(source.mode).toBe('live');
    await expect(source.products('winter')).resolves.toEqual([]);
    await expect(source.product('chaussons-bouillotte-foyer')).resolves.toBeNull();
    await expect(source.categories('summer')).resolves.toEqual([]);
    await expect(source.bundles('winter')).resolves.toEqual([]);
    expect(apiGetServer.mock.calls.flat()).toEqual([
      '/api/products?limit=50&season=winter',
      '/api/products/chaussons-bouillotte-foyer',
      '/api/categories?season=summer',
      '/api/bundles',
    ]);
  } finally {
    vi.doUnmock('@/lib/catalog/preview-data');
    vi.doUnmock('@/lib/api-server');
  }
});
