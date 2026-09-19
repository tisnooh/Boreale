'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';
import { ArrowRightIcon } from '@/components/Icons';

/**
 * Sélection en rail horizontal snap (drag / molette / boutons) — rupture avec la
 * grille e-commerce classique. Accessible : boutons prev/next + scroll clavier natif.
 */
export function SelectionRail({ products }: { products: ProductDTO[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <section id="selection" aria-label="La sélection" className="border-y border-line bg-snow py-20 lg:py-28">
      <div className="container-x">
        <Reveal className="mb-10 flex items-end justify-between gap-6">
          <div className="max-w-xl">
            <Overline index="N°02" label="La sélection" />
            <h2 className="display-section mt-5">
              Les pièces qui
              <br />
              <em>réchauffent vraiment.</em>
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Faire défiler vers la gauche"
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-ink hover:-translate-x-0.5"
            >
              <ArrowRightIcon width={16} height={16} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Faire défiler vers la droite"
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-ink hover:translate-x-0.5"
            >
              <ArrowRightIcon width={16} height={16} />
            </button>
          </div>
        </Reveal>
      </div>

      <div
        ref={railRef}
        className="rail flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-4 px-4 pb-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
      >
        {products.map((p, i) => (
          <div key={p.slug} className="w-[70vw] shrink-0 snap-start sm:w-[320px]">
            <Reveal delay={Math.min(i, 3) * 80}>
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          </div>
        ))}
        <div className="flex w-[70vw] shrink-0 snap-start items-center sm:w-[320px]">
          <Link href="/collections" className="link-editorial">
            Toute la collection <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
