'use client';

import { useRef, type ReactNode } from 'react';

export function MobilePieceRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const track = rail.current;
    const card = track?.firstElementChild;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (card.clientWidth + gap), behavior: 'auto' });
  }

  return (
    <div className="mt-12 min-w-0 lg:hidden">
      <div ref={rail} tabIndex={0} role="region" aria-label="Pièces de la collection hiver"
        className="rail flex w-full min-w-0 snap-x snap-proximity scroll-px-2 gap-4 overflow-x-auto overscroll-x-contain px-2 py-5 [&>figure]:snap-start">
        {children}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Carte précédente"
          className="grid size-11 place-items-center rounded-full border border-white/30 text-ice">←</button>
        <button type="button" onClick={() => move(1)} aria-label="Carte suivante"
          className="grid size-11 place-items-center rounded-full border border-white/30 text-ice">→</button>
      </div>
    </div>
  );
}
