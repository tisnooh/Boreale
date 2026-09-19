'use client';


import { SafeImage } from '@/components/ui/SafeImage';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';
import { EmptyState, Spinner, StatusBadge } from '@/components/ui';
import { OrderTimeline } from '@/components/OrderTimeline';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'unauthorized' | 'notfound'>('loading');

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    api
      .get<{ data: OrderDTO }>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => {
        setOrder(res.data);
        setState('ok');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setState('unauthorized');
        else setState('notfound');
      });
  }, [orderId]);

  if (state === 'loading' || !orderId) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Chargement de la commande…" />
      </div>
    );
  }

  if (state === 'unauthorized') {
    return (
      <div className="container-x py-14">
        <EmptyState
          title="Connexion requise"
          text="Cette commande est associée à un compte. Connectez-vous avec l’email utilisé lors de l’achat, ou utilisez le suivi invité."
          action={
            <div className="flex gap-2">
              <Link href="/account" className="btn-primary btn-sm">Se connecter</Link>
              <Link href="/track-order" className="btn-outline btn-sm">Suivi invité</Link>
            </div>
          }
        />
      </div>
    );
  }

  if (state === 'notfound' || !order) {
    return (
      <div className="container-x py-14">
        <EmptyState
          title="Commande introuvable"
          text="Vérifiez le lien, ou retrouvez votre commande avec le suivi invité (numéro + email)."
          action={<Link href="/track-order" className="btn-primary btn-sm">Suivi de commande</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-x py-12">
      <nav className="mb-4 text-xs text-muted">
        <Link href="/account/orders" className="hover:text-ember-dark">← Mes commandes</Link>
      </nav>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Commande {order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-8 text-sm text-muted">Passée le {formatDate(order.placedAt)} · {order.email}</p>

      <div className="card mb-8 p-6">
        <OrderTimeline order={order} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-label="Articles" className="card p-6">
          <h2 className="font-display mb-4 text-lg font-semibold">Articles</h2>
          <ul className="flex flex-col divide-y divide-line">
            {order.items.map((it, idx) => (
              <li key={`${it.sku}-${idx}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <SafeImage src={it.imageUrl ?? '/products/placeholder.svg'} alt="" width={64} height={64} className="h-16 w-16 rounded-xl border border-line object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{it.productName}</p>
                  <p className="text-xs text-muted">{it.variantTitle} · {it.sku}</p>
                  <p className="text-xs text-muted">×{it.quantity} à {formatCents(it.unitPriceCents)}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCents(it.totalCents)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-6">
          <section aria-label="Récapitulatif" className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Récapitulatif</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-success"><dt>Remise {order.discountCode}</dt><dd className="tabular-nums">− {formatCents(order.discountCents)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Livraison ({order.shippingMethod === 'express' ? 'express' : 'standard'})</dt><dd className="tabular-nums">{order.shippingCents === 0 ? 'Offerte' : formatCents(order.shippingCents)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCents(order.totalCents)}</dd></div>
            </dl>
          </section>
          <section aria-label="Adresse de livraison" className="card p-6">
            <h2 className="font-display mb-3 text-lg font-semibold">Adresse de livraison</h2>
            <p className="text-sm leading-relaxed text-muted">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
              {order.shippingAddress.line1}<br />
              {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
              {order.shippingAddress.postalCode} {order.shippingAddress.city}<br />
              {order.shippingAddress.country}
              {order.shippingAddress.phone && <><br />{order.shippingAddress.phone}</>}
            </p>
          </section>
        </aside>
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Une question sur cette commande ?{' '}
        <Link href="/contact" className="font-semibold text-ember-dark underline underline-offset-2">Contactez-nous</Link> en
        indiquant le numéro {order.number}.
      </p>
    </div>
  );
}
