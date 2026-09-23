import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getCatalogSource, filterProducts, sortProducts, type CatalogSort } from '@/lib/catalog/source';
import { matchesShopSeason } from '@/lib/season/types';
import { BRAND, SITE_URL } from '@/lib/constants';
import { ProductCard } from '@/components/product/ProductCard';
import { CatalogControls } from '@/components/CatalogControls';
import { EmptyState } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<ReturnType<typeof buildMetadata>> {
  const { slug } = await params;
  const source = getCatalogSource();
  const categories = await source.categories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) {
    return buildMetadata({ title: 'Collection introuvable', description: 'Cette collection n’existe pas.', path: `/collections/${slug}`, noIndex: true });
  }
  const seasonLabel = cat.season === 'summer' ? 'Été — ' : '';
  return buildMetadata({
    title: `${seasonLabel}${cat.name} — ${cat.tagline ?? BRAND.name}`,
    description:
      cat.description ??
      `Découvrez la collection ${cat.name} ${BRAND.name} : produits chauds et durables sélectionnés pour l'hiver. Livraison offerte dès 69 €.`,
    path: `/collections/${slug}`,
    image: cat.imageUrl ?? undefined,
  });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sp.q ?? '';
  const sort = (sp.sort ?? 'featured') as CatalogSort;
  const source = getCatalogSource();

  const categories = await source.categories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const all = await source.products();
  const products = sortProducts(
    filterProducts(all, { category: slug, q: q || undefined }),
    sort
  );

  const shopSeason = matchesShopSeason(cat.season ?? 'winter', 'summer') && cat.season !== 'all-season' ? 'summer' : 'winter';

  return (
    <div data-season={shopSeason}>
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Accueil', path: '/' },
              { name: 'Collections', path: '/collections' },
              { name: cat.name, path: `/collections/${cat.slug}` },
            ])
          ),
        }}
      />
      {/* Bandeau catégorie */}
      <div className="bg-ink py-14 text-white">
        <div className="container-x">
          <nav aria-label="Fil d'Ariane" className="mb-3 text-xs text-ice/60">
            <Link href="/" className="hover:text-white">Accueil</Link> <span aria-hidden>/</span>{' '}
            <Link href="/collections" className="hover:text-white">Collections</Link> <span aria-hidden>/</span>{' '}
            <span className="text-white">{cat.name}</span>
          </nav>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">{cat.name}</h1>
          {cat.tagline && <p className="mt-2 text-glacier">{cat.tagline}</p>}
          {cat.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ice/75">{cat.description}</p>}
        </div>
      </div>

      <div className="container-x py-10">
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
              title={q ? `Aucun résultat pour « ${q} »` : 'Aucun produit dans cette collection pour le moment'}
              text="Le catalogue est mis à jour régulièrement — revenez bientôt ou explorez les autres univers."
              action={<Link href="/collections" className="btn-outline btn-sm">Voir toute la collection</Link>}
            />
          )}
        </div>
        <p className="mt-10 text-xs text-muted">
          Collection {cat.name} — {BRAND.name} · {SITE_URL.replace(/^https?:\/\//, '')}
        </p>
      </div>
    </>
    </div>
  );
}
