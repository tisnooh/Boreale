import Link from 'next/link';
import { getCatalogSource } from '@/lib/catalog/source';
import { buildMetadata, organizationJsonLd } from '@/lib/seo';
import { BRAND } from '@/lib/constants';
import type { ProductDTO } from '@/lib/types';
import { Cover } from '@/components/home/Cover';
import { Marquee } from '@/components/home/Marquee';
import { UniversIndex } from '@/components/home/UniversIndex';
import { SelectionRail } from '@/components/home/SelectionRail';
import { ParallaxQuote } from '@/components/home/ParallaxQuote';
import { Manifesto } from '@/components/home/Manifesto';
import { Packs } from '@/components/home/Packs';
import { FaqSection } from '@/components/home/FaqSection';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />

      <Cover hero={settings.hero} />
      <Marquee />
      <UniversIndex categories={categories} />
      <SelectionRail products={featured} />
      <ParallaxQuote image="/images/hero-hiver.jpg" />
      <Manifesto benefits={settings.benefits} />
      <Packs bundles={bundles} allProducts={allProducts} />

      {/* N°05 — FAQ */}
      <section aria-label="Questions fréquentes" className="border-t border-line bg-snow">
        <div className="container-x py-20 lg:py-28">
          <Reveal className="mx-auto max-w-3xl">
            <Overline index="N°05" label="Questions fréquentes" />
            <h2 className="display-section mt-5 text-center">
              Tout ce qu’on nous demande, <em>avant d’acheter.</em>
            </h2>
            <div className="mt-10">
              <FaqSection faq={settings.faq} />
            </div>
            <p className="mt-8 text-center text-sm text-muted">
              Une autre question ?{' '}
              <Link href="/contact" className="font-semibold text-ember-dark underline underline-offset-2">
                Écrivez-nous
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* N°06 — Newsletter */}
      <section aria-label="Newsletter" className="border-t border-line">
        <div className="container-x py-20 lg:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Overline index="N°06" label="Le courrier d’hiver" />
            <h2 className="display-section mt-5">
              Une lettre par mois,
              <br />
              <em>pas une de plus.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">
              Conseils chaleur, sorties de produits et ventes privées réservées aux abonnés.
              Désinscription en un clic, évidemment.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <NewsletterForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
