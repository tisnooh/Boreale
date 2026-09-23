import Image from 'next/image';
import Link from 'next/link';
import { getCatalogSource } from '@/lib/catalog/source';
import { Folio } from '@/components/home/Folio';
import { UniversIndex } from '@/components/home/UniversIndex';
import { SelectionRail } from '@/components/home/SelectionRail';
import { ParallaxQuote } from '@/components/home/ParallaxQuote';
import { Manifesto } from '@/components/home/Manifesto';
import { FaqSection } from '@/components/home/FaqSection';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';
import { ArrowRightIcon, SnowflakeIcon } from '@/components/Icons';
import { SUMMER_INSPIRATION, SUMMER_PACK_CONCEPTS, SUMMER_QUOTE } from '@/lib/season/content-summer';

/**
 * Home ÉTÉ : même moteur componentiel que l'hiver (tokens retokénisés via
 * data-season="summer" posé sur <body>), narration commerciale propre à l'été.
 * Aucun produit/prix inventé : sélection et packs affichent leur état réel
 * (« en préparation ») jusqu'au sourcing.
 */
export async function SummerHome() {
  const source = getCatalogSource();
  const [settings, categories, products] = await Promise.all([
    source.homepage('summer'),
    source.categories('summer'),
    source.products('summer'),
  ]);
  const hero = settings.hero;

  return (
    <>
      {/* Cover été : lumière, sable, lagune */}
      <section className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-snow text-ink">
        <div className="absolute inset-0" aria-hidden>
          {hero.image && (
            <Image src={hero.image} alt="" fill priority sizes="100vw" className="kenburns object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-snow/95 via-snow/60 to-snow/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-snow via-transparent to-snow/30" />
        </div>

        <div className="container-x relative grid flex-1 items-center gap-12 pt-16 lg:grid-cols-12 lg:pt-24">
          <div className="lg:col-span-8">
            <p className="overline mb-8 max-w-md">
              <span className="text-ember-dark">{hero.eyebrow}</span>
              <span>Maison d’été — France</span>
            </p>
            <h1 className="display-cover">
              <span className="line-mask">
                <span style={{ '--line-delay': '60ms' } as React.CSSProperties}>L’été,</span>
              </span>
              <span className="line-mask">
                <span style={{ '--line-delay': '180ms' } as React.CSSProperties}>
                  <em className="text-ember-dark">à ciel ouvert.</em>
                </span>
              </span>
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-ink-500">{hero.subtitle}</p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link href={hero.ctaHref} className="btn bg-ember text-white hover:bg-ember-dark">
                {hero.ctaLabel} <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link href={hero.secondaryCtaHref} className="link-editorial">
                {hero.secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="container-x relative pb-8">
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-ink/10 pt-6">
            <nav aria-label="Sommaire de la page été" className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              {[
                ['#univers', '01', 'Les univers'],
                ['#selection', '02', 'Sélection'],
                ['#manifeste', '03', 'Manifeste'],
                ['#packs', '04', 'Packs'],
              ].map(([href, n, label]) => (
                <Link key={href} href={href} className="group flex items-baseline gap-3">
                  <span className="font-display text-xs text-ember-dark tabular-nums">{n}</span>
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-ink-500 uppercase transition-colors group-hover:text-ink">
                    {label}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] text-ink-500 uppercase">
              <span>48 h expédition</span>
              <span>30 j retours</span>
            </div>
          </div>
        </div>
      </section>

      <Folio season="summer" />
      <UniversIndex categories={categories} />

      {/* N°02 — Sélection : rail si produits, sinon état éditorial honnête */}
      {products.length > 0 ? (
        <SelectionRail products={products} />
      ) : (
        <section id="selection" aria-label="Sélection été" className="border-y border-line bg-snow py-24 lg:py-32">
          <div className="container-x max-w-2xl">
            <Reveal>
              <Overline index="N°02" label="La sélection été" />
              <h2 className="display-section mt-5">
                En préparation,
                <br />
                <em>comme il se doit.</em>
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                Nous appliquons à l’été la même règle qu’à l’hiver : rien n’entre au catalogue sans
                avoir été cherché, testé et validé. Le sourcing été est une phase dédiée — les pièces
                retenues apparaîtront ici, et nulle part ailleurs avant.
              </p>
              <div className="mt-8 max-w-md">
                <NewsletterForm />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <ParallaxQuote image={SUMMER_QUOTE.image} text={SUMMER_QUOTE.text} />
      <Manifesto benefits={settings.benefits} />

      {/* N°04 — Packs : système prêt, compositions à venir */}
      <section id="packs" aria-label="Packs été" className="container-x py-24 lg:py-32">
        <Reveal className="mb-10 max-w-xl">
          <Overline index="N°04" label="Packs d’été" />
          <h2 className="display-section mt-5">
            Des ensembles,
            <br />
            <em>bientôt.</em>
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Le système de packs est le même qu’en hiver : des pièces qui vivent ensemble, moins
            chères que séparément. Les compositions été seront publiées avec la sélection — avec
            des économies réelles, jamais affichées avant d’exister.
          </p>
        </Reveal>
        <ul className="grid gap-4 md:grid-cols-3">
          {SUMMER_PACK_CONCEPTS.map((pack, i) => (
            <Reveal as="li" key={pack.name} delay={i * 90}>
              <div className="card card-lift flex h-full flex-col gap-3 border-dashed p-6">
                <span className="font-display text-sm text-ember-dark tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display text-xl font-semibold">{pack.name}</h3>
                <p className="text-xs tracking-[0.16em] text-muted uppercase">{pack.univers}</p>
                <p className="mt-auto flex items-center gap-2 pt-4 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  <SnowflakeIcon width={12} height={12} className="rotate-180 text-ember-dark" aria-hidden />
                  {pack.note}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* N°05 — Inspiration */}
      <section aria-label="Inspiration été" className="border-t border-line bg-snow py-24 lg:py-32">
        <div className="container-x">
          <Reveal className="mb-10 max-w-xl">
            <Overline index="N°05" label="Inspiration" />
            <h2 className="display-section mt-5">
              Trois manières
              <br />
              <em>d’habiter l’été.</em>
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {SUMMER_INSPIRATION.map((item, i) => (
              <Reveal key={item.slug} delay={i * 100} variant={i === 1 ? 'scale' : 'up'}>
                <Link href={`/collections/${item.slug}`} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-card border border-line">
                    <Image src={item.image} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="font-display mt-4 block text-lg font-semibold transition-colors group-hover:text-ember-dark">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{item.text}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* N°06 — FAQ */}
      <section aria-label="Questions fréquentes été" className="border-t border-line">
        <div className="container-x py-24 lg:py-32">
          <Reveal className="mx-auto max-w-3xl">
            <Overline index="N°06" label="Questions fréquentes" />
            <h2 className="display-section mt-5 text-center">
              L’été, <em>en toute clarté.</em>
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

      {/* N°07 — Newsletter */}
      <section aria-label="Newsletter été" className="border-t border-line bg-ice/60">
        <div className="container-x py-24 lg:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Overline index="N°07" label="Le courrier d’été" />
            <h2 className="display-section mt-5">
              Une lettre par mois,
              <br />
              <em>pas une de plus.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">
              Avancée du sourcing, sorties de produits et ventes privées réservées aux abonnés.
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
