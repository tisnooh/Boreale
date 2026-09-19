'use client';


import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { formatCents, freeShippingProgress } from '@/lib/format';
import { SHIPPING } from '@/lib/constants';
import { QtyStepper } from '@/components/ui';
import { XIcon } from '@/components/Icons';

export function CartDrawer() {
  const { items, ready, drawerOpen, closeDrawer, updateQuantity, removeItem, subtotalCents } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Accessibilité : focus entrant sur le panneau, restoration à la fermeture
  useEffect(() => {
    if (drawerOpen) {
      lastFocused.current = document.activeElement as HTMLElement;
      panelRef.current?.focus();
    } else if (lastFocused.current) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  const progress = freeShippingProgress(subtotalCents, SHIPPING.standard.freeAboveCents);
  const remaining = SHIPPING.standard.freeAboveCents - subtotalCents;

  return (
    <div className={`fixed inset-0 z-[90] ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-ink/50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeDrawer}
      />
      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Panier"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg">Votre panier</h2>
          <button type="button" onClick={closeDrawer} aria-label="Fermer le panier" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-ice">
            <XIcon />
          </button>
        </div>

        {ready && items.length > 0 && (
          <div className="border-b border-line px-5 py-3">
            {remaining > 0 ? (
              <p className="mb-2 text-xs text-muted">
                Plus que <strong className="text-ink">{formatCents(remaining)}</strong> pour la livraison offerte
              </p>
            ) : (
              <p className="mb-2 text-xs font-semibold text-success">Livraison standard offerte 🎉</p>
            )}
            <div className="h-1.5 overflow-hidden rounded-full bg-ice">
              <div className="h-full rounded-full bg-glacier transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!ready ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-lg">Votre panier est vide</p>
              <p className="max-w-xs text-sm text-muted">Il fait froid dehors — trouvez de quoi vous réchauffer.</p>
              <Link href="/collections" className="btn-primary btn-sm" onClick={closeDrawer}>
                Voir la collection
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3">
                  <Link href={`/products/${item.productSlug}`} onClick={closeDrawer} className="shrink-0">
                    <SafeImage
                      src={item.imageUrl ?? '/products/placeholder.svg'}
                      alt={item.name}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] rounded-xl border border-line object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/products/${item.productSlug}`} onClick={closeDrawer} className="text-sm font-semibold hover:text-ember-dark">
                          {item.name}
                        </Link>
                        <p className="text-xs text-muted">{item.variantTitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        aria-label={`Retirer ${item.name}`}
                        className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
                      >
                        Retirer
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <QtyStepper
                        small
                        value={item.quantity}
                        max={Math.max(item.maxQuantity, item.quantity)}
                        onChange={(v) => updateQuantity(item.variantId, v)}
                      />
                      <span className="text-sm font-semibold tabular-nums">{formatCents(item.priceCents * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ready && items.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted">Sous-total</span>
              <span className="font-display text-lg font-semibold tabular-nums">{formatCents(subtotalCents)}</span>
            </div>
            <p className="mb-3 text-xs text-muted">Livraison et remises calculées à l’étape suivante.</p>
            <div className="flex flex-col gap-2">
              <Link href="/checkout" className="btn-primary" onClick={closeDrawer}>
                Passer commande
              </Link>
              <Link href="/cart" className="btn-outline btn-sm" onClick={closeDrawer}>
                Voir le panier détaillé
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
