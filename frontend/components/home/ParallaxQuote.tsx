'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

/**
 * Break pleine largeur avec parallaxe légère (transform, rAF) et citation serif.
 * Désactivé si prefers-reduced-motion (image fixe).
 */
const WINTER_QUOTE = ['« Le froid n’est pas l’ennemi.', 'C’est une saison à habiter. »'];

export function ParallaxQuote({ image, text = WINTER_QUOTE }: { image: string; text?: readonly string[] }) {
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = imgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5 → 0.5
      el.style.transform = `translateY(${progress * -12}%)`;
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section aria-label="Manifeste visuel" className="relative h-[52svh] min-h-[380px] overflow-hidden bg-ink">
      <div ref={imgRef} className="absolute inset-0 h-[124%] will-change-transform">
        <Image src={image} alt="" fill sizes="100vw" className="object-cover opacity-70" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/60" aria-hidden />
      <div className="relative flex h-full items-center justify-center px-6">
        <p className="display-section max-w-3xl text-center text-white">
          {text[0]}
          <br />
          <em className="text-ember">{text[1]}</em>
        </p>
      </div>
    </section>
  );
}
