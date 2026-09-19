'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { formatCents, stockLabel } from '@/lib/format';
import type { ProductDTO, VariantDTO } from '@/lib/types';
import { QtyStepper } from '@/components/ui';
import { CheckIcon } from '@/components/Icons';

interface Props {
  product: ProductDTO;
}

/** Sélecteur de variante + quantité + ajout panier (prix revérifiés côté serveur au checkout). */
export function ProductPurchase({ product }: Props) {
  const variants = product.variants ?? [];
  const optionKeys = useMemo(() => {
    const keys: string[] = [];
    for (const v of product.variants ?? []) for (const k of Object.keys(v.options)) if (!keys.includes(k)) keys.push(k);
    return keys;
  }, [product.variants]);

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const first = variants.find((v) => v.inStock) ?? variants[0];
    return first ? { ...first.options } : {};
  });
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  const selected: VariantDTO | undefined =
    variants.find((v) => optionKeys.every((k) => (selection[k] ? v.options[k] === selection[k] : true))) ?? variants[0];

  if (variants.length === 0) {
    return <p className="text-sm text-muted">Ce produit n’est pas encore disponible à la vente.</p>;
  }

  const outOfStock = !selected?.inStock;

  function onAdd() {
    if (!selected) return;
    addItem(
      { slug: product.slug, name: product.name, imageUrl: product.imageUrl },
      selected,
      Math.min(quantity, selected.quantity ?? quantity)
    );
    toast(`${product.name} ajouté au panier`, 'success');
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Dimensions d'options (taille, couleur…) */}
      {optionKeys.map((key) => {
        const values = [...new Set(variants.map((v) => v.options[key]).filter(Boolean))] as string[];
        if (values.length <= 1) return null;
        return (
          <fieldset key={key}>
            <legend className="field-label">{key}</legend>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const active = selection[key] === val;
                const disabled = values.length > 1 && !variants.some((v) => v.options[key] === val && v.inStock);
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelection((s) => ({ ...s, [key]: val }))}
                    aria-pressed={active}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-glacier'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Variante unique : titre */}
      {optionKeys.filter((k) => [...new Set(variants.map((v) => v.options[k]))].length > 1).length === 0 && (
        <p className="text-sm text-muted">
          Variante : <span className="font-semibold text-ink">{selected?.title}</span>
        </p>
      )}

      {/* Prix + stock */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl font-semibold tabular-nums">{selected ? formatCents(selected.priceCents) : ''}</span>
        {selected && (
          <span
            className={`text-xs font-semibold ${
              outOfStock ? 'text-danger' : selected.lowStock ? 'text-ember-dark' : 'text-success'
            }`}
          >
            {stockLabel(selected.quantity)}
          </span>
        )}
      </div>

      {/* Quantité + ajout */}
      <div className="flex flex-wrap items-center gap-3">
        <QtyStepper value={quantity} max={Math.max(1, Math.min(20, selected?.quantity ?? 20))} onChange={setQuantity} />
        <button type="button" onClick={onAdd} disabled={outOfStock} className="btn-primary flex-1 sm:flex-none sm:px-10">
          {outOfStock ? 'Indisponible' : 'Ajouter au panier'}
        </button>
      </div>

      {/* Réassurance */}
      <ul className="grid gap-1.5 border-t border-line pt-4 text-xs text-muted sm:grid-cols-2">
        <li className="flex items-center gap-1.5">
          <CheckIcon width={14} height={14} className="text-success" /> Livraison offerte dès 69 €
        </li>
        <li className="flex items-center gap-1.5">
          <CheckIcon width={14} height={14} className="text-success" /> Retours sous 30 jours
        </li>
        <li className="flex items-center gap-1.5">
          <CheckIcon width={14} height={14} className="text-success" /> Paiement sécurisé Stripe
        </li>
        <li className="flex items-center gap-1.5">
          <CheckIcon width={14} height={14} className="text-success" /> Expédié depuis la France
        </li>
      </ul>
    </div>
  );
}
