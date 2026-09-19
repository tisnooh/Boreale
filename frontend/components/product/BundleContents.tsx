import { CheckIcon, PackageIcon } from '@/components/Icons';
import type { BundleItemRef } from '@/lib/types';

/** Contenu d'un bundle — factuel (SKUs réels, pas de contenu inventé). */
export function BundleContents({ items }: { items: BundleItemRef[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
        <PackageIcon width={18} height={18} className="text-ember" /> Ce pack contient
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.sku} className="flex items-start gap-2 text-sm">
            <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-success" />
            <span>
              {it.name}
              {it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}
              <span className="ml-2 text-xs text-muted">({it.sku})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
