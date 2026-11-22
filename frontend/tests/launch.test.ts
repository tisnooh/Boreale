import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('publication avant ouverture', () => {
  it('bloque les appels API navigateur et serveur avant toute requête distante', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'launch');
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');
    const { apiGetServer } = await import('@/lib/api-server');
    await expect(api.post('/api/stripe/checkout', {})).rejects.toMatchObject({ code: 'launch_mode' });
    expect(await apiGetServer('/api/products')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('ne contacte aucun service dans le sitemap preview ou launch', async () => {
    const fetchMock = vi.fn(() => { throw new Error('Accès distant interdit'); });
    vi.stubGlobal('fetch', fetchMock);
    for (const mode of ['preview', 'launch']) {
      vi.stubEnv('NEXT_PUBLIC_SITE_MODE', mode);
      vi.resetModules();
      const { default: sitemap } = await import('@/app/sitemap');
      const entries = await sitemap();
      expect(entries).toHaveLength(mode === 'launch' ? 1 : 0);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirige les anciennes URLs boutique en launch et conserve les aperçus', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'launch');
    vi.resetModules();
    const { middleware } = await import('@/middleware');
    for (const path of ['/collections', '/products/chaussons', '/checkout', '/admin', '/ete', '/account']) {
      const response = middleware(new NextRequest(`https://boreale.example${path}`));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://boreale.example/');
    }
    expect(middleware(new NextRequest('https://boreale.example/')).status).toBe(200);
    vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'preview');
    vi.resetModules();
    const preview = await import('@/middleware');
    expect(preview.middleware(new NextRequest('https://boreale.example/collections')).status).toBe(200);
  });

  it('interdit l’indexation du catalogue de démonstration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'preview');
    vi.resetModules();
    const { default: robots } = await import('@/app/robots');
    expect(robots().rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });
});

it('affiche la vitrine publique sans activer le catalogue ni les transactions', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'showcase');
  vi.resetModules();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const { middleware } = await import('@/middleware');
  const base = 'https://boreale.example';
  for (const path of ['/', '/collections', '/ete']) {
    expect(middleware(new NextRequest(base + path)).status).toBe(200);
  }
  for (const path of ['/checkout/', '/checkout/success', '/admin']) {
    const response = middleware(new NextRequest(base + path));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(base + '/collections');
  }
  const { api } = await import('@/lib/api');
  const { apiGetServer } = await import('@/lib/api-server');
  await expect(api.post('/api/stripe/checkout', {})).rejects.toMatchObject({ status: 503 });
  expect(await apiGetServer('/api/products')).toBeNull();
  const { getCatalogSource } = await import('@/lib/catalog/source');
  const source = getCatalogSource();
  const products = await source.products('winter');
  expect(products).toHaveLength(5);
  expect(products.every((product) => product.selection?.status === 'draft' &&
    product.selection.priceVerified === false && !product.inStock && product.variants?.length === 0)).toBe(true);
  expect(await source.product('chaussettes-polaires-nuage')).toMatchObject({ inStock: false });
  expect(await source.product('chaussons-bouillotte-foyer')).toBeNull();
  expect(await source.products('summer')).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});
