import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it('indexe toutes les pages du catalogue avec la limite API autorisée', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'live');
  vi.resetModules();
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requested.push(url);
    if (url.endsWith('/api/categories')) return Response.json({ data: [{ slug: 'hiver' }] });
    const query = new URL(url).searchParams;
    expect(query.get('limit')).toBe('50');
    const count = query.get('page') === '1' ? 50 : 1;
    return Response.json({ data: Array.from({ length: count }, (_, i) => ({ slug: `p${query.get('page')}-${i}` })), total: 51 });
  }));
  const { default: sitemap } = await import('@/app/sitemap');
  const entries = await sitemap();
  expect(entries.filter((entry) => entry.url.includes('/products/'))).toHaveLength(51);
  expect(entries.some((entry) => entry.url.endsWith('/collections/hiver'))).toBe(true);
  expect(requested.filter((url) => url.includes('/api/products'))).toHaveLength(2);
});

it('arrête la pagination si API indisponible sans créer de produit fictif', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'live');
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
  const { default: sitemap } = await import('@/app/sitemap');
  expect((await sitemap()).filter((entry) => entry.url.includes('/products/'))).toHaveLength(0);
});
