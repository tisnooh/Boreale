import { describe, expect, it } from 'vitest';
import { getCatalogSource, filterProducts, sortProducts } from '@/lib/catalog/source';

describe('source catalogue (mode preview par défaut)', () => {
  it('expose le mode preview sans aucun appel réseau', async () => {
    const source = getCatalogSource();
    expect(source.mode).toBe('preview');
    expect(source.isPreview).toBe(true);
    const products = await source.products();
    expect(products.length).toBeGreaterThan(5);
  });

  it('retourne une fiche complète : variantes + produits liés', async () => {
    const source = getCatalogSource();
    const p = await source.product('chaussons-bouillotte-foyer');
    expect(p).not.toBeNull();
    expect(p!.variants!.length).toBe(1);
    expect(p!.variants![0]!.priceCents).toBe(4490);
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
    expect(bundles.length).toBeGreaterThanOrEqual(2);
  });
});

describe('filtres & tri indépendants de la source', () => {
  const source = getCatalogSource();

  it('filtre par catégorie', async () => {
    const all = await source.products();
    const auto = filterProducts(all, { category: 'auto-hiver' });
    expect(auto.length).toBeGreaterThan(0);
    expect(auto.every((p) => p.categories.some((c) => c.slug === 'auto-hiver'))).toBe(true);
  });

  it('filtre par texte (insensible à la casse)', async () => {
    const all = await source.products();
    const r = filterProducts(all, { q: 'PARE-BRISE' });
    expect(r.some((p) => p.slug === 'housse-pare-brise-sentinelle')).toBe(true);
  });

  it('tri prix croissant cohérent', async () => {
    const all = await source.products();
    const sorted = sortProducts(all, 'price_asc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.priceCents).toBeGreaterThanOrEqual(sorted[i - 1]!.priceCents);
    }
  });
});
