
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogSource } from '@/lib/catalog/source';
import { isPreview } from '@/lib/config';
import { buildMetadata, breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { BRAND, SITE_URL } from '@/lib/constants';
import type { ProductDTO } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { relatedTitle } from '@/lib/season/nav';
import { Reveal } from '@/components/ui/Reveal';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { BundleContents } from '@/components/product/BundleContents';
import { ProductCard } from '@/components/product/ProductCard';
import { CheckIcon, ReturnIcon, ShieldIcon, TruckIcon } from '@/components/Icons';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<ProductDTO | null> {
  return getCatalogSource().product(slug);
}

export async function generateMetadata({ params }: Props): Promise<ReturnType<typeof buildMetadata>> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return buildMetadata({ title: 'Produit introuvable', description: 'Ce produit n’existe pas ou n’est plus disponible.', path: `/products/${slug}`, noIndex: true });
  }
  return buildMetadata({
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description.slice(0, 155),
    path: `/products/${product.slug}`,
    noIndex: Boolean(product.selection),
    image: product.imageUrl?.startsWith('http') ? product.imageUrl : product.imageUrl ? `${SITE_URL}${product.imageUrl}` : undefined,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const absoluteImage = product.imageUrl
    ? product.imageUrl.startsWith('http')
      ? product.imageUrl
      : `${SITE_URL}${product.imageUrl}`
    : null;

  const shopSeason = product.season === 'summer' ? 'summer' : 'winter';

  return (
    <div data-season={shopSeason}>
    <>
      {/* Structured data uniquement en mode live : pas de schema Produit sur des données de démonstration */}
      {!isPreview() && !product.selection && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, absoluteImage)) }} />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Accueil', path: '/' },
              { name: 'Collections', path: '/collections' },
              ...(product.categories[0]
                ? [{ name: product.categories[0].name, path: `/collections/${product.categories[0].slug}` }]
                : []),
              { name: product.name, path: `/products/${product.slug}` },
            ])
          ),
        }}
      />

      <div className="container-x py-8 lg:py-12">
        <nav aria-label="Fil d'Ariane" className="mb-6 text-xs text-muted">
          <Link href="/" className="hover:text-ember-dark">Accueil</Link> <span aria-hidden>/</span>{' '}
          <Link href="/collections" className="hover:text-ember-dark">Collections</Link>
          {product.categories[0] && (
            <>
              {' '}<span aria-hidden>/</span>{' '}
              <Link href={`/collections/${product.categories[0].slug}`} className="hover:text-ember-dark">
                {product.categories[0].name}
              </Link>
            </>
          )}{' '}
          <span aria-hidden>/</span> <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery
            key={product.slug}
            name={product.name}
            imageUrl={product.imageUrl}
            images={product.images}
            badge={product.badge}
            awaitingPhotos={Boolean(product.selection)}
          />

          {/* Achat */}
          <Reveal delay={120}>
          <div>
            <Overline label={product.categories.map((c) => c.name).join(' · ') || BRAND.name} />
            <h1 className="font-display mt-2 text-3xl leading-tight font-semibold sm:text-4xl">{product.name}</h1>
            {product.subtitle && <p className="mt-2 text-base text-muted italic">{product.subtitle}</p>}
            <p className="mt-5 text-sm leading-relaxed text-ink-500">{product.description}</p>

            <div className="mt-7">
              <ProductPurchase product={product} />
            </div>

            {product.type === 'bundle' && <div className="mt-7"><BundleContents items={product.bundleItems} /></div>}

            {/* Engagements */}
            <div className="mt-7 grid grid-cols-3 gap-3 text-center">
              {[
                { Icon: TruckIcon, label: 'Livraison et suivi' },
                { Icon: ReturnIcon, label: 'Conditions de retour' },
                { Icon: ShieldIcon, label: product.selection ? 'Vente non ouverte' : 'Paiement sécurisé' },
              ].map(({ Icon, label }) => (
                <div key={label} className="card flex flex-col items-center gap-1.5 p-3">
                  <Icon width={18} height={18} className="text-glacier" />
                  <span className="text-[11px] font-semibold text-ink-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
          </Reveal>
        </div>

        {/* Description longue */}
        {product.longDescription && (
          <Reveal as="section" aria-label="Détails du produit" className="mx-auto mt-16 max-w-3xl">
            <h2 className="font-display mb-4 text-2xl font-semibold">Détails & conseils d’utilisation</h2>
            <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line text-ink-500">
              {product.longDescription}
            </div>
          </Reveal>
        )}

        {/* Points clés tags */}
        {product.selection && (
          <section aria-label="Éléments à confirmer" className="mx-auto mt-8 max-w-3xl text-sm leading-relaxed text-ink-500">
            <h2 className="font-display mb-4 text-2xl font-semibold">Direction de sélection</h2>
            <ul className="list-disc space-y-2 pl-5">{product.selection.specifications.map((spec) => <li key={spec}>{spec}</li>)}</ul>
            {product.selection.targetColors.length > 0 && <p className="mt-4">Teintes recherchées, non encore disponibles : {product.selection.targetColors.join(', ')}.</p>}
            <p className="mt-2">Tailles, poids et matière exacte : à confirmer sur le modèle retenu.</p>
          </section>
        )}

        {product.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {product.tags.map((t) => (
              <span key={t} className="badge bg-ice text-ink-500">#{t}</span>
            ))}
          </div>
        )}

        {/* Produits liés */}
        {product.related && product.related.length > 0 && (
          <Reveal as="section" aria-label="Produits liés" className="mt-16">
            <h2 className="font-display mb-6 text-2xl font-semibold sm:text-3xl">{relatedTitle(product.season ?? 'winter')}</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {product.related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        {/* Transparence */}
        <p className="mx-auto mt-14 flex max-w-2xl items-start gap-2 text-center text-[11px] leading-relaxed text-muted">
          <CheckIcon width={14} height={14} className="mt-0.5 shrink-0 text-success" />
          {product.selection
            ? 'Fiche de préparation : modèle, caractéristiques, photographies, variantes et conditions commerciales à valider avant toute mise en vente.'
            : 'Photos : visuels de présentation provisoires — les photos définitives des produits réels sont ajoutées avant lancement. Prix TTC. Économies des packs calculées sur les prix actuels des articles séparés.'}
        </p>
      </div>
    </>
    </div>
  );
}
