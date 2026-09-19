import Image from 'next/image';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/SafeImage';
import type { ProductDTO } from '@/lib/types';
import { formatCents } from '@/lib/format';
import { Overline } from '@/components/ui/Overline';
import { ArrowRightIcon } from '@/components/Icons';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Packs en rédaction éditoriale : colonne titre collante à gauche,
 * rangées packs à droite (image, contenu, prix serif). Économies réelles affichées
 * via le badge seed (jamais de faux barré).
 */
export function Packs({ bundles, allProducts }: { bundles: ProductDTO[]; allProducts: ProductDTO[] }) {
  if (bundles.length === 0) return null;
  return (
    <section id="packs" aria-label="Packs et bundles" className="container-x py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Reveal className="lg:sticky lg:top-28">
            <Overline index="N°04" label="Packs & bundles" />
            <h2 className="display-section mt-5">
              Des ensembles
              <br />
              <em>déjà pensés.</em>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
              Chaque pack réunit des pièces qui vivent ensemble — et coûte moins cher que les
              articles achetés séparément. L’économie affichée est réelle, calculée sur les prix
              actuels du catalogue.
            </p>
            <Link href="/collections?type=bundle" className="link-editorial mt-8">
              Tous les packs <ArrowRightIcon width={14} height={14} />
            </Link>
          </Reveal>
        </div>

        <ul className="flex flex-col gap-4 lg:col-span-8">
          {bundles.map((b, i) => (
            <Reveal as="li" key={b.slug} delay={i * 90}>
              <Link
                href={`/products/${b.slug}`}
                className="group card grid grid-cols-[6rem_1fr] items-center gap-5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink/5 sm:grid-cols-[8rem_1fr_auto] sm:p-6"
              >
                <PackVisual bundle={b} allProducts={allProducts} />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
                    Pack {String(i + 1).padStart(2, '0')}
                    {b.badge && <span className="ml-3 text-ember-dark">{b.badge}</span>}
                  </span>
                  <span className="font-display mt-1.5 block text-lg font-semibold text-ink sm:text-xl">{b.name}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted">
                    {b.bundleItems.map((it) => it.name.replace(/« |»/g, '')).join(' · ')}
                  </span>
                </span>
                <span className="col-span-2 flex items-baseline justify-between gap-3 border-t border-line pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
                  <span className="font-display text-xl font-semibold tabular-nums">{formatCents(b.priceCents)}</span>
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className="hidden text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-ember-dark sm:ml-auto sm:block"
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Collage 2×2 des visuels des composants du pack (résolution par SKU). */
function PackVisual({ bundle, allProducts }: { bundle: ProductDTO; allProducts: ProductDTO[] }) {
  const images = bundle.bundleItems
    .map((item) => {
      const owner = allProducts.find((p) => p.variants?.some((v) => v.sku === item.sku));
      return owner?.imageUrl ?? null;
    })
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);
  const fallback = bundle.imageUrl ?? '/products/placeholder.svg';
  return (
    <span className="grid aspect-[4/5] grid-cols-2 gap-0.5 overflow-hidden rounded-lg border border-line bg-ice">
      {(images.length > 0 ? images : [fallback]).map((src, i) => (
        <span key={src + i} className="relative overflow-hidden">
          <SafeImage
            src={src}
            alt=""
            fill
            sizes="(max-width:640px) 48px, 64px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </span>
      ))}
    </span>
  );
}
