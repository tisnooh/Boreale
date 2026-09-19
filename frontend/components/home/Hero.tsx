import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSettings } from '@/lib/types';
import { ArrowRightIcon, SnowflakeIcon } from '@/components/Icons';

export function Hero({ hero }: { hero: HomepageSettings['hero'] }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {hero.image && (
        <Image src={hero.image} alt="" fill priority sizes="100vw" className="object-cover opacity-45" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" aria-hidden />
      <div className="container-x relative flex min-h-[540px] flex-col justify-center py-20 sm:min-h-[600px]">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-ice uppercase backdrop-blur">
          <SnowflakeIcon width={14} height={14} className="text-glacier" /> {hero.eyebrow}
        </p>
        <h1 className="font-display max-w-2xl text-4xl leading-[1.08] font-semibold sm:text-6xl">{hero.title}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ice/80 sm:text-lg">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={hero.ctaHref} className="btn bg-ember text-white hover:bg-ember-dark">
            {hero.ctaLabel} <ArrowRightIcon width={16} height={16} />
          </Link>
          <Link href={hero.secondaryCtaHref} className="btn border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/15">
            {hero.secondaryCtaLabel}
          </Link>
        </div>
        <p className="mt-8 text-xs text-ice/60">
          Livraison offerte dès 69 € · Retours 30 jours · Paiement sécurisé
        </p>
      </div>
    </section>
  );
}
