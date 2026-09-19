import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildMetadata, breadcrumbJsonLd, organizationJsonLd } from '@/lib/seo';
import { getCatalogSource, filterProducts, sortProducts, type CatalogSort } from '@/lib/catalog/source';
import { ProductCard } from '@/components/product/ProductCard';
import { CatalogControls } from '@/components/CatalogControls';
import { EmptyState } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = buildMetadata({
  title: 'La collection hiver — tous les produits',
  description:
    'Tous les essentiels BORÉALE : chaussettes polaires, gants tactiles, bonnets, bouillottes, chauffe-mains, housses pare-brise, plaids et packs hiver. Livraison offerte dès 69 €.',
  path: '/collections',
});

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const sort = (sp.sort ?? 'featured') as CatalogSort;
  const source = getCatalogSource();

  const [all, bundles] = await Promise.all([source.products(), source.bundles()]);
  const products = sortProducts(
    filterProducts(all, { q: q || undefined, type: 'product' }),
    sort
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Collections', path: '/collections' }])),
        }}
      />
      <div className="container-x py-10">
        <header className="mb-8">
          <nav aria-label="Fil d'Ariane" className="mb-3 text-xs text-muted">
            <Link href="/" className="hover:text-ember-dark">Accueil</Link> <span aria-hidden>/</span>{' '}
            <span className="text-ink">Collections</span>
          </nav>
          <h1 className="font-display text-4xl font-semibold">Toute la collection hiver</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {products.length > 0
              ? `${products.length} produit${products.length > 1 ? 's' : ''} sélectionné${products.length > 1 ? 's' : ''} et testé${products.length > 1 ? 's' : ''} pour vous garder au chaud.`
              : 'Des essentiels chauds, beaux et durables — du textile aux packs prêts à offrir.'}
          </p>
        </header>

        <Suspense fallback={null}>
          <CatalogControls />
        </Suspense>

        <div className="mt-8">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.slug} delay={(i % 4) * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              title={q ? `Aucun résultat pour « ${q} »` : 'Catalogue indisponible'}
              text={
                q
                  ? 'Essayez un autre mot-clé : plaid, gants, bonnet, pare-brise, bouillotte…'
                  : 'Le catalogue n’a pas pu être chargé. Réessayez dans un instant.'
              }
              action={q ? <Link href="/collections" className="btn-outline btn-sm">Réinitialiser</Link> : undefined}
            />
          )}
        </div>

        {bundles.length > 0 && (
          <section id="packs" aria-label="Packs et bundles" className="mt-16 rounded-card bg-ink p-8 text-white sm:p-12">
            <h2 className="font-display text-3xl font-semibold">Packs & bundles</h2>
            <p className="mt-2 max-w-xl text-sm text-ice/70">
              Des ensembles cohérents à offrir ou à s’offrir — moins chers que les articles achetés séparément.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {bundles.map((b) => (
                <ProductCard key={b.slug} product={b} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
