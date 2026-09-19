
import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { formatCents } from '@/lib/format';
import type { ProductDTO } from '@/lib/types';

export function ProductCard({ product, priority = false }: { product: ProductDTO; priority?: boolean }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group card flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5"
    >
      <div className="relative aspect-square overflow-hidden bg-ice">
        <SafeImage
          src={product.imageUrl ?? '/products/placeholder.svg'}
          alt={product.name}
          width={480}
          height={480}
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {product.badge && (
          <span className="badge absolute top-3 left-3 bg-ember text-white shadow">{product.badge}</span>
        )}
        {product.type === 'bundle' && !product.badge && (
          <span className="badge absolute top-3 left-3 bg-ink text-white">Pack</span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-semibold text-white">
            Rupture de stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-[11px] font-semibold tracking-wider text-glacier uppercase">
          {product.categories[0]?.name ?? 'Boréale'}
        </p>
        <h3 className="font-display text-[15px] leading-snug font-semibold text-ink group-hover:text-ember-dark">
          {product.name}
        </h3>
        {product.subtitle && <p className="line-clamp-2 text-xs text-muted">{product.subtitle}</p>}
        <p className="mt-auto pt-2 text-sm font-bold tabular-nums">
          {formatCents(product.priceCents)}
          {product.variantCount > 1 && <span className="ml-1 text-[11px] font-medium text-muted">et plus</span>}
        </p>
      </div>
    </Link>
  );
}
