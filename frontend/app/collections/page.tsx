import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildMetadata, breadcrumbJsonLd, organizationJsonLd } from '@/lib/seo';
import { getCatalogSource, filterProducts, sortProducts, type CatalogSort } from '@/lib/catalog/source';
import { ProductCard } from '@/components/product/ProductCard';
import { CatalogControls } from '@/components/CatalogControls';
import { EmptyState } from '@/components/ui';
import { ArrowRightIcon } from '@/components/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { Overline } from '@/components/ui/Overline';
import { SUMMER_PACK_CONCEPTS } from '@/lib/season/content-summer';

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; saison?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.saison === 'ete') {
    return buildMetadata({
      title: 'La collection été — plage, voyage, fraîcheur, outdoor',
      description:
        'L’univers été BORÉALE : plage & piscine, voyage, fraîcheur, outdoor, auto été et maison & terrasse. Sélection en préparation, même exigence que l’hiver.',
      path: '/collections?saison=ete',
    });
  }
  return buildMetadata({
    title: 'La collection hiver — tous les produits',
    description:
      'Tous les essentiels BORÉALE : chaussettes polaires, gants tactiles, bonnets, bouillottes, chauffe-mains, housses pare-brise, plaids et packs hiver. Livraison offerte dès 69 €.',
    path: '/collections',
  });
}

export default async function CollectionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const sort = (sp.sort ?? 'featured') as CatalogSort;
  const summer = sp.saison === 'ete';
  const source = getCatalogSource();

  const [all, bundles] = await Promise.all([
    source.products(summer ? 'summer' : 'winter'),
    summer ? Promise.resolve([]) : source.bundles(),
  ]);
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
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Accueil', path: '/' },
              ...(summer ? [{ name: 'Été', path: '/ete' }] : []),
              { name: summer ? 'Collections été' : 'Collections', path: summer ? '/collections?saison=ete' : '/collections' },
            ])
          ),
        }}
      />
      <div className="container-x py-10">
        <header className="mb-8">
          <nav aria-label="Fil d'Ariane" className="mb-3 text-xs text-muted">
            <Link href="/" className="hover:text-ember-dark">Accueil</Link> <span aria-hidden>/</span>{' '}
            {summer && (
              <>
                <Link href="/ete" className="hover:text-ember-dark">Été</Link> <span aria-hidden>/</span>{' '}
              </>
            )}
            <span className="text-ink">{summer ? 'Collections été' : 'Collections'}</span>
          </nav>
          <h1 className="font-display text-4xl font-semibold">
            {summer ? 'Toute la collection été' : 'Toute la collection hiver'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {summer
              ? 'Les univers été sont ouverts : la sélection de produits arrive après la phase de sourcing dédiée. Même exigence, même transparence.'
              : products.length > 0
                ? `${products.length} produit${products.length > 1 ? 's' : ''} sélectionné${products.length > 1 ? 's' : ''} et testé${products.length > 1 ? 's' : ''} pour vous garder au chaud.`
                : 'Des essentiels chauds, beaux et durables — du textile aux packs prêts à offrir.'}
          </p>
          {summer && (
            <Link href="/ete" className="link-editorial mt-4">
              Retour à l’univers été <ArrowRightIcon width={14} height={14} />
            </Link>
          )}
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
          ) : summer ? (
            <EmptyState
              title="Sélection été en préparation"
              text="Aucun produit été n’est encore au catalogue : le sourcing est une phase dédiée. Inscrivez-vous au courrier d’été pour être prévenu de l’ouverture."
              action={
                <div className="flex gap-2">
                  <Link href="/ete" className="btn-primary btn-sm">Visiter l’univers été</Link>
                  <Link href="/collections" className="btn-outline btn-sm">Voir l’hiver</Link>
                </div>
              }
            />
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

        {/* Packs : hiver = bundles réels ; été = concepts honnêtes */}
        {summer ? (
          <section id="packs" aria-label="Packs été" className="mt-20 rounded-card bg-snow p-8 sm:p-12">
            <Overline index="N°04" label="Packs d’été" />
            <h2 className="display-section mt-4">
              Des ensembles, <em>bientôt.</em>
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {SUMMER_PACK_CONCEPTS.map((pack, i) => (
                <li key={pack.name} className="card flex h-full flex-col gap-3 border-dashed p-6">
                  <span className="font-display text-sm text-ember-dark tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-display text-xl font-semibold">{pack.name}</h3>
                  <p className="text-xs tracking-[0.16em] text-muted uppercase">{pack.univers}</p>
                  <p className="mt-auto pt-4 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{pack.note}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          bundles.length > 0 && (
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
          )
        )}
      </div>
    </>
  );
}
