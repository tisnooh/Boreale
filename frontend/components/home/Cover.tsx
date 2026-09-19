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

/** Polaroid éditorial : photo + légende « Pièce N°XX — Nom », tiltée et flottante. */
function PieceCard({
  src,
  caption,
  className = '',
  tilt = '-3deg',
  delay = '0s',
  width = 176,
}: {
  src: string;
  caption: string;
  className?: string;
  tilt?: string;
  delay?: string;
  width?: number;
}) {
  return (
    <figure
      className={`polaroid overflow-hidden rounded-lg border border-white/25 bg-ink shadow-2xl shadow-black/60 ${className}`}
      style={{ '--tilt': tilt, '--float-delay': delay, width } as React.CSSProperties}
    >
      <Image src={src} alt={caption} width={480} height={480} sizes={`${width}px`} className="aspect-square object-cover" />
      <figcaption className="px-3 py-2 text-[9px] font-semibold tracking-[0.22em] text-ice/80 uppercase">{caption}</figcaption>
    </figure>
  );
}

const PIECES = [
  { src: '/images/products/chaussons-bouillotte-foyer.jpg', caption: 'Pièce N°07 — Foyer' },
  { src: '/images/products/housse-pare-brise-sentinelle.jpg', caption: 'Pièce N°11 — Sentinelle' },
  { src: '/images/products/plaid-sherpa-nid.jpg', caption: 'Pièce N°13 — Nid' },
  { src: '/images/products/chaussettes-polaires-nuage.jpg', caption: 'Pièce N°01 — Nuage' },
] as const;

/**
 * Cover magazine plein écran : photo immersive en fond, typographie géante masquée,
 * polaroids « Pièce N°XX » dispersés et flottants (desktop) / rangée scrollable (mobile),
 * sommaire cliquable en pied.
 */
export function Cover({ hero }: { hero: HomepageSettings['hero'] }) {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-ink text-white">
      {/* Fond image plein écran */}
      <div className="absolute inset-0" aria-hidden>
        {hero.image && (
          <Image src={hero.image} alt="" fill priority sizes="100vw" className="kenburns object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/60 to-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
      </div>

      {/* Corps */}
      <div className="container-x relative grid flex-1 items-center gap-12 pt-16 lg:grid-cols-12 lg:pt-24">
        <div className="lg:col-span-7">
          <p className="overline overline-dark mb-8 max-w-md">
            <span className="text-ember">Maison d’hiver</span>
            <span>France — 14 pièces</span>
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
          <p className="mt-8 max-w-md text-base leading-relaxed text-ice/80">{hero.subtitle}</p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href={hero.ctaHref} className="btn bg-ember text-white hover:bg-ember-dark">
              {hero.ctaLabel} <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href={hero.secondaryCtaHref} className="link-editorial !text-ice after:!bg-ice hover:!text-ember">
              {hero.secondaryCtaLabel}
            </Link>
          </div>

          {/* Polaroids mobile : rangée scrollable */}
          <div className="rail -mx-4 mt-12 flex gap-4 overflow-x-auto px-4 pb-2 lg:hidden">
            {PIECES.map((p, i) => (
              <PieceCard key={p.caption} src={p.src} caption={p.caption} width={150} tilt={i % 2 ? '2.5deg' : '-2.5deg'} delay={`${i * 0.7}s`} className="shrink-0" />
            ))}
          </div>
        </div>

        {/* Polaroids desktop : dispersion flottante */}
        <div className="relative hidden h-[26rem] lg:col-span-5 lg:block" aria-hidden={false}>
          <PieceCard src={PIECES[0].src} caption={PIECES[0].caption} className="absolute left-0 top-6" tilt="-4deg" delay="0s" width={190} />
          <PieceCard src={PIECES[1].src} caption={PIECES[1].caption} className="absolute right-2 top-0" tilt="3deg" delay="1.2s" width={168} />
          <PieceCard src={PIECES[2].src} caption={PIECES[2].caption} className="absolute left-24 bottom-0" tilt="2deg" delay="2.1s" width={176} />
          <PieceCard src={PIECES[3].src} caption={PIECES[3].caption} className="absolute right-8 bottom-10" tilt="-2.5deg" delay="3s" width={150} />
          <span className="absolute -right-2 top-1/2 rotate-90 text-[10px] tracking-[0.45em] text-ice/50 uppercase" aria-hidden>
            Collection hiver — N°01
          </span>
        </div>
      </div>

      {/* Sommaire + méta */}
      <div className="container-x relative pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/15 pt-6">
          <nav aria-label="Sommaire de la page" className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {CHAPTERS.map(([href, n, label]) => (
              <Link key={href} href={href} className="group flex items-baseline gap-3">
                <span className="font-display text-xs text-ember tabular-nums">{n}</span>
                <span className="text-[11px] font-semibold tracking-[0.2em] text-ice/75 uppercase transition-colors group-hover:text-white">
                  {label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] text-ice/60 uppercase">
            <span>48 h expédition</span>
            <span>30 j retours</span>
            <span className="hidden h-8 w-px overflow-hidden bg-white/25 sm:block">
              <span className="scroll-cue block h-full w-full bg-ember" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
