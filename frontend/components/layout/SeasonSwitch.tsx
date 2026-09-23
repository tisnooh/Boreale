'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSeasonFromPath } from '@/lib/season/config';
import { SEASON_LABELS, type ShopSeason } from '@/lib/season/types';

const LINKS: { season: ShopSeason; href: string }[] = [
  { season: 'winter', href: '/' },
  { season: 'summer', href: '/ete' },
];

/**
 * Switch Hiver / Été : deux liens pilule, état actif perceptible,
 * utilisable souris / tactile / clavier (focus visible natif).
 * Toujours visible : l'utilisateur sait en permanence où il se trouve.
 */
export function SeasonSwitch({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const current = getSeasonFromPath(pathname);

  return (
    <nav aria-label="Choix de l’univers saisonnier" className={`inline-flex rounded-full border border-line bg-white p-1 ${className}`}>
      {LINKS.map(({ season, href }) => {
        const active = current === season;
        return (
          <Link
            key={season}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glacier ${
              active ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {SEASON_LABELS[season]}
          </Link>
        );
      })}
    </nav>
  );
}
