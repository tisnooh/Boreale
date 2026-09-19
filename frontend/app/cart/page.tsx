'use client';


import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { decodeRestore, toCartItems, type RestorableVariant } from '@/lib/cart-restore';
import { isPreview } from '@/lib/config';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { computeLocalTotals } from '@/lib/totals';
import { SHIPPING } from '@/lib/constants';
import type { ShippingMethod } from '@/lib/types';
import { EmptyState, QtyStepper, Spinner } from '@/components/ui';
import { TrashIcon } from '@/components/Icons';
import { useToast } from '@/hooks/use-toast';

interface DiscountState {
  code: string | null;
  discountCents: number;
  message: string | null;
  loading: boolean;
  error: string | null;
}

function CartPageInner() {
  const { items, ready, updateQuantity, removeItem, subtotalCents, replaceCart } = useCart();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const restoreAttempted = useRef(false);

  // Restauration depuis un lien email panier abandonné (/cart?restore=…)
  useEffect(() => {
    if (!ready || restoreAttempted.current) return;
    const param = searchParams.get('restore');
    if (isPreview()) {
      if (param) router.replace('/cart'); // restauration liée à un email réel : mode live uniquement
      return;
    }
    if (!param) return;
    restoreAttempted.current = true;
    const requested = decodeRestore(param);
    if (requested.length === 0) {
      router.replace('/cart');
      return;
    }
    (async () => {
      try {
        const res = await api.get<{ data: RestorableVariant[] }>(
          `/api/variants?ids=${encodeURIComponent(requested.map((i) => i.variantId).join(','))}`
        );
        const restored = toCartItems(requested, res.data);
        if (restored.length > 0) {
          replaceCart(restored);
          toast(`Panier restauré : ${restored.length} article${restored.length > 1 ? 's' : ''}.`, 'success');
        } else {
          toast('Les articles de ce panier ne sont plus disponibles.', 'info');
        }
      } catch {
        toast('Restauration impossible pour le moment (API indisponible).', 'error');
      } finally {
        router.replace('/cart');
      }
    })();
  }, [ready, searchParams, router, replaceCart, toast]);
  const [method, setMethod] = useState<ShippingMethod>('standard');
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<DiscountState>({ code: null, discountCents: 0, message: null, loading: false, error: null });

  const totals = computeLocalTotals(subtotalCents, discount.discountCents, method);

  // Réinitialise la remise si le panier change sous le minimum (message serveur au checkout de toute façon)
  useEffect(() => {
    if (discount.code && items.length === 0) {
      setDiscount({ code: null, discountCents: 0, message: null, loading: false, error: null });
    }
  }, [items.length, discount.code]);

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setDiscount((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await api.post<{ data: { valid: boolean; discountCents: number; message: string } }>('/api/discounts/validate', {
        code: codeInput.trim(),
        subtotalCents,
      });
      if (res.data.valid) {
        setDiscount({ code: codeInput.trim().toUpperCase(), discountCents: res.data.discountCents, message: res.data.message, loading: false, error: null });
        toast('Code promo appliqué', 'success');
      } else {
        setDiscount((d) => ({ ...d, loading: false, error: res.data.message }));
      }
    } catch {
      setDiscount((d) => ({ ...d, loading: false, error: 'Impossible de valider le code (API indisponible).' }));
    }
  }

  if (!ready) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Chargement du panier…" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-14">
        <h1 className="font-display mb-8 text-3xl font-semibold sm:text-4xl">Votre panier</h1>
        <EmptyState
          title="Votre panier est vide"
          text="Parcourez la collection et trouvez de quoi affronter l’hiver."
          action={<Link href="/collections" className="btn-primary btn-sm">Voir la collection</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-display mb-8 text-3xl font-semibold sm:text-4xl">Votre panier ({items.length})</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Articles */}
        <div>
          <ul className="flex flex-col divide-y divide-line">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 py-5 first:pt-0">
                <Link href={`/products/${item.productSlug}`} className="shrink-0">
                  <SafeImage
                    src={item.imageUrl ?? '/products/placeholder.svg'}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-xl border border-line object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="font-semibold hover:text-ember-dark">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted">{item.variantTitle}</p>
                      <p className="mt-1 text-xs text-muted">{formatCents(item.priceCents)} / unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      aria-label={`Retirer ${item.name} du panier`}
                      className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-ice hover:text-danger"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QtyStepper
                      value={item.quantity}
                      max={Math.max(item.maxQuantity, item.quantity)}
                      onChange={(v) => updateQuantity(item.variantId, v)}
                    />
                    <span className="font-semibold tabular-nums">{formatCents(item.priceCents * item.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Code promo */}
          <form onSubmit={applyCode} className="mt-6">
            <label htmlFor="discount-code" className="field-label">Code promo</label>
            <div className="flex gap-2">
              <input
                id="discount-code"
                className="field max-w-52 uppercase"
                placeholder="WELCOME10"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              <button type="submit" className="btn-outline btn-sm" disabled={discount.loading}>
                {discount.loading ? 'Vérification…' : 'Appliquer'}
              </button>
            </div>
            {discount.code && <p className="mt-2 text-xs font-semibold text-success">✓ {discount.code} appliqué — {discount.message}</p>}
            {discount.error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{discount.error}</p>}
          </form>
        </div>

        {/* Résumé */}
        <aside aria-label="Résumé de la commande" className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Résumé</h2>

            <fieldset className="mb-5">
              <legend className="field-label">Livraison</legend>
              <div className="flex flex-col gap-2">
                {(Object.keys(SHIPPING) as ShippingMethod[]).map((m) => {
                  const opt = SHIPPING[m];
                  return (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                        method === m ? 'border-glacier bg-glacier/5' : 'border-line hover:border-glacier/50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="shipping"
                          value={m}
                          checked={method === m}
                          onChange={() => setMethod(m)}
                          className="accent-[#3D7EA6]"
                        />
                        <span>
                          <span className="font-semibold">{opt.label}</span>
                          <span className="block text-xs text-muted">{opt.etaLabel}</span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums">
                        {opt.freeAboveCents !== null && subtotalCents - discount.discountCents >= opt.freeAboveCents
                          ? 'Offerte'
                          : formatCents(opt.priceCents)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Sous-total</dt>
                <dd className="tabular-nums">{formatCents(totals.subtotalCents)}</dd>
              </div>
              {totals.discountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Remise {discount.code}</dt>
                  <dd className="tabular-nums">− {formatCents(totals.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Livraison</dt>
                <dd className="tabular-nums">{totals.shippingCents === 0 ? 'Offerte' : formatCents(totals.shippingCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCents(totals.totalCents)}</dd>
              </div>
            </dl>

            <Link href="/checkout" className="btn-primary mt-5 w-full">
              Passer commande
            </Link>
            <p className="mt-3 text-center text-[11px] text-muted">
              Les totaux définitifs sont recalculés et confirmés par le serveur à l’étape de paiement.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x grid place-items-center py-24">
          <Spinner label="Chargement du panier…" />
        </div>
      }
    >
      <CartPageInner />
    </Suspense>
  );
}
