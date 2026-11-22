'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { SafeImage } from '@/components/ui/SafeImage';

interface Props {
  name: string;
  imageUrl: string | null;
  images: string[];
  badge?: string | null;
  awaitingPhotos?: boolean;
}

export function ProductGallery({ name, imageUrl, images, badge, awaitingPhotos }: Props) {
  const gallery = [...new Set([imageUrl, ...images].filter((src): src is string => Boolean(src)))];
  const [selected, setSelected] = useState(0);
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const active = Math.min(selected, Math.max(0, gallery.length - 1));

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || !event.isPrimary || gallery.length < 2) return;
    swipeStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    swipeStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    setSelected(Math.max(0, Math.min(gallery.length - 1, active + (dx < 0 ? 1 : -1))));
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
      <div
        className="relative aspect-[4/5] touch-pan-y touch-pinch-zoom overflow-hidden rounded-card border border-line bg-ice"
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={() => { swipeStart.current = null; }}
      >
        {awaitingPhotos && gallery.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-xs tracking-[0.22em] text-muted uppercase">BORÉALE</span>
            <span className="font-display text-3xl text-ink">{name}</span>
            <span className="text-sm text-muted">Photographies du modèle en préparation</span>
          </div>
        ) : (
          <SafeImage
            key={gallery[active]}
            src={gallery[active] ?? '/products/placeholder.svg'}
            alt={gallery.length > 1 ? `${name} — visuel ${active + 1} sur ${gallery.length}` : name}
            fill
            priority={active === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        )}
        {badge && <span className="badge absolute top-4 left-4 bg-ember text-white shadow">{badge}</span>}
      </div>
      {gallery.length > 1 && (
        <div className="grid grid-cols-4 gap-3" role="group" aria-label="Photos du produit">
          {gallery.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Afficher le visuel ${index + 1}`}
              aria-pressed={active === index}
              onClick={() => setSelected(index)}
              className="relative aspect-square overflow-hidden rounded-xl border border-line bg-ice aria-pressed:border-glacier aria-pressed:ring-1 aria-pressed:ring-glacier"
            >
              <SafeImage src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
