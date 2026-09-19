import Link from 'next/link';
import { getCatalogSource } from '@/lib/catalog/source';
import { buildMetadata, organizationJsonLd } from '@/lib/seo';
import { BRAND } from '@/lib/constants';
import type { ProductDTO } from '@/lib/types';
import { Hero } from '@/components/home/Hero';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { Benefits, ReassuranceBar } from '@/components/home/Benefits';
import { FaqSection } from '@/components/home/FaqSection';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { ProductCard } from '@/components/product/ProductCard';
import { ArrowRightIcon, SnowflakeIcon } from '@/components/Icons';

// Fallbacks locaux = copies exactes des valeurs par défaut du backend (services/settings.ts).
// Utilisés UNIQUEMENT si l'API est injoignable (build/dev) — jamais de fausses données produit.

export const metadata = buildMetadata({
  title: `${BRAND.name} — ${BRAND.slogan}`,
  description:
    'Essentiels d’hiver sélectionnés et testés : textile chaud, chaleur sans électricité, auto hiver et cocooning. Packs cadeaux, livraison France offerte dès 69 €.',
  path: '/',
});

export default async function HomePage() {
  const source = getCatalogSource();
  const [settings, categories, allProducts, bundles] = await Promise.all([
    source.homepage(),
    source.categories(),
    source.products(),
    source.bundles(),
  ]);

  const bySlug = (slug: string) => allProducts.find((p) => p.slug === slug);
  const featured = settings.featuredProductSlugs.map(bySlug).filter((p): p is ProductDTO => Boolean(p));
  const featuredBundles = settings.bundleSlugs.map((s) => bundles.find((b) => b.slug === s)).filter((b): b is ProductDTO => Boolean(b));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <Hero hero={settings.hero} />

      {!source.isPreview && allProducts.length === 0 && (
        <p className="bg-cream px-4 py-2 text-center text-xs text-ink-500">
          Catalogue temporairement indisponible (API backend hors ligne) — les sections produits réapparaîtront dès
          reconnexion.
        </p>
      )}

      <CategoryGrid categories={categories} />

      {featured.length > 0 && (
        <section aria-label="Produits vedettes" className="container-x py-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Les indispensables de la saison</h2>
            <Link href="/collections" className="btn-outline btn-sm hidden sm:inline-flex">
              Tout voir <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      <Benefits benefits={settings.benefits} />

      {featuredBundles.length > 0 && (
        <section id="packs" aria-label="Packs et bundles" className="bg-ink py-16 text-white">
          <div className="container-x">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-glacier uppercase">
                  <SnowflakeIcon width={14} height={14} /> Prêts à offrir
                </p>
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">Nos packs hiver</h2>
                <p className="mt-2 max-w-xl text-sm text-ice/70">
                  Des ensembles cohérents, moins chers que les articles achetés séparément — l’économie affichée est
                  réelle.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featuredBundles.map((b) => (
                <ProductCard key={b.slug} product={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      <ReassuranceBar />

      <section aria-label="Questions fréquentes" className="container-x py-16">
        <h2 className="mb-6 text-center font-display text-3xl font-semibold sm:text-4xl">Questions fréquentes</h2>
        <FaqSection faq={settings.faq} />
        <p className="mt-6 text-center text-sm text-muted">
          Une autre question ?{' '}
          <Link href="/contact" className="font-semibold text-ember-dark underline-offset-2 hover:underline">
            Écrivez-nous
          </Link>
        </p>
      </section>

      <section aria-label="Newsletter" className="container-x pb-4">
        <div className="card bg-gradient-to-br from-ice to-snow p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ne ratez pas le premier grand froid</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Conseils chaleur, sorties de produits et ventes privées — un email par mois maximum, désinscription en un
            clic.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
