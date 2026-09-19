'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

type Sort = 'featured' | 'price_asc' | 'price_desc' | 'newest';

const SORT_LABELS: Record<Sort, string> = {
  featured: 'Sélection',
  price_asc: 'Prix croissant',
  price_desc: 'Prix décroissant',
  newest: 'Nouveautés',
};

/** Recherche + tri via query params (le serveur rend les résultats — SEO friendly). */
export function CatalogControls() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const sort = (params.get('sort') as Sort) || 'featured';

  const update = useCallback(
    (next: { q?: string; sort?: Sort }) => {
      const sp = new URLSearchParams(params.toString());
      if (next.q !== undefined) {
        if (next.q) sp.set('q', next.q);
        else sp.delete('q');
      }
      if (next.sort !== undefined) {
        if (next.sort === 'featured') sp.delete('sort');
        else sp.set('sort', next.sort);
      }
      router.push(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q });
        }}
      >
        <label htmlFor="catalog-q" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="catalog-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher : plaid, gants, pare-brise…"
          className="field pr-20"
        />
        <button type="submit" className="btn-dark btn-sm absolute top-1.5 right-1.5">
          Chercher
        </button>
      </form>
      <div className="flex items-center gap-2">
        <label htmlFor="catalog-sort" className="text-xs font-semibold tracking-wide text-muted uppercase">
          Trier
        </label>
        <select
          id="catalog-sort"
          value={sort}
          onChange={(e) => update({ sort: e.target.value as Sort })}
          className="field w-auto py-2.5"
        >
          {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
