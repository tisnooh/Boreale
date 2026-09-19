import Link from 'next/link';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatCents } from '@/lib/format';
import type { ProductDTO } from '@/lib/types';

/**
 * Carte produit éditoriale : ratio 4/5, voile au survol avec appel « Voir le produit »,
 * nom en serif, catégorie en surtitre, prix avec mention « dès » si variantes multiples.
 */
export function ProductCard({ product, priority = false }: { product: ProductDTO; priority?: boolean }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col"
      aria-label={`${product.name} — ${formatCents(product.priceCents)}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-line bg-ice">
        <SafeImage
          src={product.imageUrl ?? '/products/placeholder.svg'}
          alt={product.name}
          width={480}
          height={600}
          priority={priority}
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        />
        {product.badge && (
          <span className="absolute top-3 left-3 rounded-full border border-white/40 bg-ink/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white uppercase backdrop-blur">
            {product.badge}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-2 text-center text-[11px] font-semibold tracking-wide text-white uppercase">
            Rupture de stock
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 rounded-lg bg-white/95 py-2.5 text-center text-xs font-semibold text-ink opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden
        >
          Voir le produit →
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted uppercase">
          {product.categories[0]?.name ?? 'Boréale'}
        </p>
        <h3 className="font-display text-[17px] leading-snug font-semibold text-ink transition-colors group-hover:text-ember-dark">
          {product.name}
        </h3>
        <p className="mt-auto pt-2 text-sm tabular-nums">
          {product.variantCount > 1 && <span className="mr-1 text-xs text-muted">dès</span>}
          <span className="font-semibold">{formatCents(product.priceCents)}</span>
        </p>
      </div>
    </Link>
  );
}
