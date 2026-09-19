import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSettings } from '@/lib/types';
import { ArrowRightIcon } from '@/components/Icons';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Héro éditorial asymétrique : typographie display à gauche, visuel encadré à droite,
 * méta-promesses en pied de colonne. Identité BORÉALE conservée (nuit polaire / braise).
 */
export function Hero({ hero }: { hero: HomepageSettings['hero'] }) {
  return (
    <section className="relative bg-ink text-white">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
        {/* Colonne éditoriale */}
        <div className="flex flex-col justify-center lg:col-span-7">
          <p className="overline overline-dark mb-8">
            <span className="text-ember">N°01</span>
            <span>{hero.eyebrow}</span>
          </p>
          <h1 className="display-hero">
            <span className="line-mask">
              <span style={{ '--line-delay': '80ms' } as React.CSSProperties}>L’hiver,</span>
            </span>
            <span className="line-mask">
              <span style={{ '--line-delay': '200ms' } as React.CSSProperties}>
                <em className="text-ember">du bon côté.</em>
              </span>
            </span>
          </h1>
          <Reveal delay={340}>
            <p className="mt-8 max-w-lg text-base leading-relaxed text-ice/75 sm:text-lg">{hero.subtitle}</p>
          </Reveal>
          <Reveal delay={460}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href={hero.ctaHref} className="btn bg-ember text-white hover:bg-ember-dark">
              {hero.ctaLabel} <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href={hero.secondaryCtaHref} className="link-editorial !text-ice after:!bg-ice hover:!text-ember">
              {hero.secondaryCtaLabel}
            </Link>
          </div>
          </Reveal>
          <Reveal delay={600}>
          <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              ['48 h', 'expédition depuis la France'],
              ['30 j', 'pour changer d’avis'],
              ['14', 'produits, pas un de plus'],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-2xl font-semibold text-white sm:text-3xl">{n}</dt>
                <dd className="mt-1 text-[11px] leading-snug tracking-wide text-ice/60 uppercase">{l}</dd>
              </div>
            ))}
          </dl>
          </Reveal>
        </div>

        {/* Visuel encadré */}
        <Reveal variant="scale" delay={250} className="relative lg:col-span-5">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card border border-white/10">
            {hero.image && (
              <Image src={hero.image} alt="Ambiance d’hiver BORÉALE — intérieur chaud, neige au-dehors" fill priority sizes="(max-width:1024px) 100vw, 42vw" className="kenburns object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" aria-hidden />
          </div>
          <p className="mt-3 text-right text-[10px] tracking-[0.22em] text-ice/50 uppercase">
            Visuel d’ambiance — collection hiver
          </p>
          <span
            className="absolute -left-8 top-1/2 hidden -translate-y-1/2 -rotate-90 text-[10px] tracking-[0.4em] text-ice/40 uppercase xl:block"
            aria-hidden
          >
            Boréale — maison d’hiver
          </span>
        </Reveal>
      </div>
    </section>
  );
}
