'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { CategoryDTO } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';
import { ArrowRightIcon } from '@/components/Icons';

/**
 * Index des univers + aperçu flottant suivant le curseur (desktop uniquement).
 * Sur tactile / reduced-motion : l'aperçu est désactivé en CSS, l'index reste pleinement utilisable.
 */
export function UniversIndex({ categories }: { categories: CategoryDTO[] }) {
  const [active, setActive] = useState<CategoryDTO | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function onMove(e: React.MouseEvent) {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const el = previewRef.current;
      if (!el) return;
      el.style.translate = `${e.clientX + 40}px ${e.clientY - 160}px`;
    });
  }

  if (categories.length === 0) return null;

  return (
    <section id="univers" aria-label="Nos univers" className="container-x py-20 lg:py-28" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <Reveal className="mb-10 flex items-end justify-between gap-6">
        <div className="max-w-xl">
          <Overline index="N°01" label="Les univers" />
          <h2 className="display-section mt-5">
            Quatre territoires,
            <br />
            <em>un seul froid à vaincre.</em>
          </h2>
        </div>
        <Link href="/collections" className="link-editorial hidden shrink-0 sm:inline-flex">
          Tout voir <ArrowRightIcon width={14} height={14} />
        </Link>
      </Reveal>

      <ul className="border-t border-line">
        {categories.map((c, i) => (
          <Reveal as="li" key={c.slug} delay={i * 70} className="border-b border-line">
            <Link
              href={`/collections/${c.slug}`}
              className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 transition-colors hover:bg-snow sm:grid-cols-[3.5rem_4.5rem_1fr_auto_auto] sm:gap-6 sm:px-2 lg:py-8"
              onMouseEnter={() => setActive(c)}
              onFocus={() => setActive(c)}
              onBlur={() => setActive(null)}
            >
              <span className="font-display text-sm text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="relative hidden h-16 w-16 overflow-hidden rounded-lg border border-line sm:block">
                {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
              <span className="min-w-0">
                <span className="font-display block text-2xl font-semibold text-ink transition-transform duration-300 group-hover:translate-x-1.5 sm:text-3xl">
                  {c.name}
                </span>
                <span className="mt-1 block truncate text-sm text-muted">{c.tagline}</span>
              </span>
              {typeof c.productCount === 'number' && (
                <span className="hidden text-[11px] tracking-[0.18em] text-muted uppercase sm:block">
                  {c.productCount} pièce{c.productCount > 1 ? 's' : ''}
                </span>
              )}
              <ArrowRightIcon width={20} height={20} className="justify-self-end text-muted transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-ember-dark" />
            </Link>
          </Reveal>
        ))}
      </ul>

      {/* Aperçu curseur */}
      <div ref={previewRef} className={`cursor-preview ${active ? 'is-on' : ''}`} aria-hidden>
        {active?.imageUrl && (
          <div className="h-full w-full overflow-hidden rounded-card border border-line shadow-2xl shadow-ink/30">
            <Image src={active.imageUrl} alt="" fill sizes="272px" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
