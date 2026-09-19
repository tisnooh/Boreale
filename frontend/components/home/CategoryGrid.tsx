import Image from 'next/image';
import Link from 'next/link';
import type { CategoryDTO } from '@/lib/types';
import { ArrowRightIcon } from '@/components/Icons';

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-label="Nos univers" className="container-x py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Quatre univers pour un hiver chaud</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Du textile technique aux plaisirs du coin du feu — tout ce qu’il faut, rien de superflu.
          </p>
        </div>
        <Link href="/collections" className="btn-outline btn-sm hidden sm:inline-flex">
          Tout voir <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="group relative aspect-[4/5] overflow-hidden rounded-card bg-ink"
          >
            {c.imageUrl && (
              <Image
                src={c.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 25vw"
                className="object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-95"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <h3 className="font-display text-xl font-semibold">{c.name}</h3>
              {c.tagline && <p className="mt-1 text-xs text-ice/75">{c.tagline}</p>}
              {typeof c.productCount === 'number' && (
                <p className="mt-2 text-[11px] font-semibold tracking-wider text-glacier uppercase">
                  {c.productCount} produit{c.productCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
