import { describe, expect, it } from 'vitest';
import { getCatalogSource, filterProducts, sortProducts } from '@/lib/catalog/source';

describe('source catalogue (mode preview par défaut)', () => {
  it('expose le mode preview sans aucun appel réseau', async () => {
    const source = getCatalogSource();
    expect(source.mode).toBe('preview');
    expect(source.isPreview).toBe(true);
    const products = await source.products();
    expect(products.length).toBe(5);
  });

  it('retourne une fiche complète : variantes + produits liés', async () => {
    const source = getCatalogSource();
    const p = await source.product('chaussons-bouillotte-foyer');
    expect(p).not.toBeNull();
    expect(p!.selection?.status).toBe('deferred');
    expect(p!.variants).toEqual([]);
    expect(p!.inStock).toBe(false);
    expect(Array.isArray(p!.related)).toBe(true);
  });

  it('produit inexistant → null (pas de crash, pas de donnée inventée)', async () => {
    const source = getCatalogSource();
    expect(await source.product('n-existe-pas')).toBeNull();
  });

  it('bundles séparés des produits simples', async () => {
    const source = getCatalogSource();
    const bundles = await source.bundles();
    expect(bundles.every((b) => b.type === 'bundle')).toBe(true);
    expect(bundles).toEqual([]);
  });
});

describe('filtres & tri indépendants de la source', () => {
  const source = getCatalogSource();

  it('filtre par catégorie', async () => {
    const all = await source.products();
    const auto = filterProducts(all, { category: 'confort-textile' });
    expect(auto.length).toBeGreaterThan(0);
    expect(auto.every((p) => p.categories.some((c) => c.slug === 'confort-textile'))).toBe(true);
  });

  it('filtre par texte (insensible à la casse)', async () => {
    const all = await source.products();
    const r = filterProducts(all, { q: 'CONTACT' });
    expect(r.some((p) => p.slug === 'gants-tactiles-contact')).toBe(true);
  });

  it('tri prix croissant cohérent', async () => {
    const all = await source.products();
    const sorted = sortProducts(all, 'price_asc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.priceCents).toBeGreaterThanOrEqual(sorted[i - 1]!.priceCents);
    }
  });
});


describe('sélection prioritaire honnête', () => {
  it('expose cinq références uniques, ordonnées et non commandables', async () => {
    const source = getCatalogSource();
    const all = sortProducts(await source.products('winter'), 'featured');
    expect(all.map(p => p.selection?.referenceSku)).toEqual(['BOR-CON', 'BOR-REF', 'BOR-BRA', 'BOR-NUA', 'BOR-SEM']);
    expect(new Set(all.map(p => p.slug)).size).toBe(5);
    for (const p of all) {
      expect(p.selection?.status).toBe('draft');
      expect(p.selection?.priceVerified).toBe(false);
      expect(p.selection?.weightGrams).toBeNull();
      expect(p.variants).toEqual([]);
      expect(p.inStock).toBe(false);
      expect(p.badge).toBeNull();
      expect(p.images).toEqual([]);
    }
    expect((await source.homepage('winter')).featuredProductSlugs).toEqual(all.map(p => p.slug));
    expect((await source.homepage('winter')).bundleSlugs).toEqual([]);
  });
  it('calcule les comptes des catégories depuis les cinq fiches', async () => {
    const source = getCatalogSource();
    const products = await source.products('winter');
    const categories = await source.categories('winter');
    expect(categories.find(c => c.slug === 'auto-hiver')).toMatchObject({ productCount: 0, tagline: 'Collection en attente' });
    for (const category of categories) expect(category.productCount).toBe(products.filter(p => p.categories.some(c => c.slug === category.slug)).length);
  });
  it('conserve la collection des anciennes fiches auto sans produit proposé', async () => {
    const source = getCatalogSource();
    const legacy = await source.product('housse-pare-brise-sentinelle');
    expect(legacy?.selection?.status).toBe('deferred');
    const category = (await source.categories('winter')).find(c => c.slug === legacy?.categories[0]?.slug);
    expect(category).toMatchObject({ slug: 'auto-hiver', productCount: 0 });
    expect((await source.categories('winter')).at(-1)?.slug).toBe('auto-hiver');
    expect(filterProducts(await source.products('winter'), { category: category!.slug })).toEqual([]);
  });
});
