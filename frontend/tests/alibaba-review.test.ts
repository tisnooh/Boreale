import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('aperçu local des cinq références Alibaba', () => {
  it('ajoute exactement cinq brouillons accessibles sur la collection de revue', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SITE_MODE', 'preview');
    vi.stubEnv('BOREALE_ALIBABA_REVIEW', 'true');
    const { getCatalogSource, filterProducts } = await import('@/lib/catalog/source');
    const source = getCatalogSource();
    const drafts = filterProducts(await source.products('winter'), { category: 'alibaba-hiver-revue' });
    expect(drafts).toHaveLength(5);
    expect(new Set(drafts.map(({ slug }) => slug)).size).toBe(5);
    expect(await source.categories('winter')).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: 'alibaba-hiver-revue', productCount: 5 }),
    ]));
    expect(new Set(drafts.map(({ imageUrl }) => imageUrl)).size).toBe(5);
    for (const draft of drafts) {
      expect(draft.imageUrl).toMatch(/^https:\/\/s\.alicdn\.com\/@sc04\/kf\//);
      expect(await source.product(draft.slug)).toMatchObject({
        inStock: false, variants: [], images: [draft.imageUrl], imageUrl: draft.imageUrl, badge: 'Photo fournisseur',
        selection: { status: 'draft', priceVerified: false, targetColors: [] },
      });
    }
    expect(await source.product('gants-tactiles-contact')).not.toBeNull();
  });

  it.each([{ nodeEnv: 'production', siteMode: 'preview' }, { nodeEnv: 'development', siteMode: 'showcase' }])(
    'garde les brouillons hors du catalogue $siteMode en $nodeEnv',
    async ({ nodeEnv, siteMode }) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      vi.stubEnv('NEXT_PUBLIC_SITE_MODE', siteMode);
      vi.stubEnv('BOREALE_ALIBABA_REVIEW', 'true');
      const { getCatalogSource } = await import('@/lib/catalog/source');
      const source = getCatalogSource();
      expect(await source.product('cape-couverture-cocooning')).toBeNull();
      expect((await source.categories('winter')).some(({ slug }) => slug === 'alibaba-hiver-revue')).toBe(false);
    },
  );
});
