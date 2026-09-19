
import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogSource } from '@/lib/catalog/source';
import { isPreview } from '@/lib/config';
import { buildMetadata, breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { BRAND, SITE_URL } from '@/lib/constants';
import type { ProductDTO } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';
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

  return (
    <>
      {/* Structured data uniquement en mode live : pas de schema Produit sur des données de démonstration */}
      {!isPreview() && (
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
          {/* Galerie */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-line bg-ice">
              <SafeImage
                src={product.imageUrl ?? '/products/placeholder.svg'}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              {product.badge && <span className="badge absolute top-4 left-4 bg-ember text-white shadow">{product.badge}</span>}
            </div>
            {product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(0, 4).map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-ice">
                    <SafeImage src={src} alt={`${product.name} — visuel ${i + 1}`} fill sizes="120px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

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
                { Icon: TruckIcon, label: 'Expédié de France' },
                { Icon: ReturnIcon, label: 'Retours 30 jours' },
                { Icon: ShieldIcon, label: 'Paiement sécurisé' },
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
            <h2 className="font-display mb-6 text-2xl font-semibold sm:text-3xl">Complétez votre hiver</h2>
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
          Photos : visuels de présentation provisoires — les photos définitives des produits réels sont ajoutées avant
          lancement. Prix TTC. Économies des packs calculées sur les prix actuels des articles séparés.
        </p>
      </div>
    </>
  );
}
