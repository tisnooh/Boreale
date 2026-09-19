import Image from 'next/image';
import Link from 'next/link';
import type { CategoryDTO } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { ArrowRightIcon } from '@/components/Icons';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Index des univers — rangées éditoriales numérotées (façon maison de mode),
 * filet hairline, vignette et compteur. Remplace la grille de cartes template.
 */
export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-label="Nos univers" className="container-x py-16 lg:py-24">
      <Reveal className="mb-10 flex items-end justify-between gap-6">
        <div className="max-w-xl">
          <Overline index="N°02" label="Les univers" />
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
          <Reveal as="li" key={c.slug} delay={i * 80} className="border-b border-line">
            <Link
              href={`/collections/${c.slug}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-snow sm:grid-cols-[3.5rem_4.5rem_1fr_auto_auto] sm:gap-6 sm:px-2 lg:py-6"
            >
              <span className="font-display text-sm text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="relative hidden h-16 w-16 overflow-hidden rounded-lg border border-line sm:block">
                {c.imageUrl && (
                  <Image src={c.imageUrl} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
              </span>
              <span className="min-w-0">
                <span className="font-display block text-xl font-semibold text-ink transition-transform duration-300 group-hover:translate-x-1 sm:text-2xl">
                  {c.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">{c.tagline}</span>
              </span>
              {typeof c.productCount === 'number' && (
                <span className="hidden text-[11px] tracking-[0.18em] text-muted uppercase sm:block">
                  {c.productCount} produit{c.productCount > 1 ? 's' : ''}
                </span>
              )}
              <ArrowRightIcon
                width={18}
                height={18}
                className="justify-self-end text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-ember-dark"
              />
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
