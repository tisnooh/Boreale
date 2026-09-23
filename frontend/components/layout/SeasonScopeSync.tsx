'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { getSeasonFromPath } from '@/lib/season/config';

/**
 * Scope de thème saisonnier FIABLE partout (Vercel inclus) :
 * - rendu SSR/clientside correct via usePathname (div data-season, display:contents)
 * - synchronise aussi <body> (overscroll, theme-color) à chaque navigation.
 * Aucune dépendance au middleware : l'univers suit l'URL, point.
 */
export function SeasonScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const season = getSeasonFromPath(pathname);

  useEffect(() => {
    document.body.dataset.season = season;
  }, [season]);

  return (
    <div data-season={season} className="contents">
      {children}
    </div>
  );
}
