import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSettings } from '@/lib/types';
import { ArrowRightIcon } from '@/components/Icons';

const CHAPTERS = [
  ['#univers', '01', 'Les univers'],
  ['#selection', '02', 'La sélection'],
  ['#manifeste', '03', 'Manifeste'],
  ['#packs', '04', 'Packs'],
] as const;

/**
 * Cover magazine : typographie géante masquée, collage de visuels décalés,
 * sommaire cliquable en pied de page. Plein écran, aucun code « boutique template ».
 */
export function Cover({ hero }: { hero: HomepageSettings['hero'] }) {
  return (
    <section className="relative flex min-h-[94svh] flex-col justify-between overflow-hidden bg-ink text-white">
      {/* halo braise + neige discrète */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[38rem] w-[38rem] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #E8622C 0%, transparent 65%)' }}
        aria-hidden
      />

      <div className="container-x grid flex-1 items-center gap-10 pt-14 lg:grid-cols-12 lg:gap-6 lg:pt-20">
        {/* Typographie */}
        <div className="lg:col-span-7">
          <p className="overline overline-dark mb-8 max-w-md">
            <span className="text-ember">Maison d’hiver</span>
            <span>France</span>
          </p>
          <h1 className="display-cover">
            <span className="line-mask">
              <span style={{ '--line-delay': '60ms' } as React.CSSProperties}>L’hiver,</span>
            </span>
            <span className="line-mask">
              <span style={{ '--line-delay': '180ms' } as React.CSSProperties}>
                <em className="text-ember">du bon côté.</em>
              </span>
            </span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-ice/70">{hero.subtitle}</p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href={hero.ctaHref} className="btn bg-ember text-white hover:bg-ember-dark">
              {hero.ctaLabel} <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href={hero.secondaryCtaHref} className="link-editorial !text-ice after:!bg-ice hover:!text-ember">
              {hero.secondaryCtaLabel}
            </Link>
          </div>
        </div>

        {/* Collage */}
        <div className="relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-white/10">
            {hero.image && (
              <Image
                src={hero.image}
                alt="Intérieur chaud BORÉALE — plaid sherpa, neige au-dehors"
                fill
                priority
                sizes="(max-width:1024px) 90vw, 38vw"
                className="kenburns object-cover"
              />
            )}
          </div>
          <figure className="absolute -bottom-10 -left-6 w-40 rotate-[-4deg] overflow-hidden rounded-lg border border-white/20 shadow-2xl shadow-black/50 sm:w-48">
            <Image
              src="/images/products/chaussons-bouillotte-foyer.jpg"
              alt="Chaussons bouillotte Foyer"
              width={480}
              height={480}
              sizes="192px"
              className="aspect-square object-cover"
            />
            <figcaption className="bg-ink/90 px-3 py-2 text-[9px] tracking-[0.2em] text-ice/70 uppercase">
              Pièce N°07 — Foyer
            </figcaption>
          </figure>
          <span
            className="absolute -right-3 top-8 hidden rotate-90 text-[10px] tracking-[0.45em] text-ice/40 uppercase xl:block"
            aria-hidden
          >
            Collection hiver — N°01
          </span>
        </div>
      </div>

      {/* Sommaire + méta */}
      <div className="container-x pb-10">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/10 pt-6">
          <nav aria-label="Sommaire de la page" className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {CHAPTERS.map(([href, n, label]) => (
              <Link key={href} href={href} className="group flex items-baseline gap-3">
                <span className="font-display text-xs text-ember tabular-nums">{n}</span>
                <span className="text-[11px] font-semibold tracking-[0.2em] text-ice/70 uppercase transition-colors group-hover:text-white">
                  {label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] text-ice/50 uppercase">
            <span>48 h expédition</span>
            <span>30 j retours</span>
            <span className="hidden h-8 w-px overflow-hidden bg-white/20 sm:block">
              <span className="scroll-cue block h-full w-full bg-ember" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
