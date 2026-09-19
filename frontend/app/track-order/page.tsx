'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';
import { Spinner, StatusBadge } from '@/components/ui';
import { OrderTimeline } from '@/components/OrderTimeline';

function TrackContent() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get('number') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Pré-remplissage depuis /checkout/success
  useEffect(() => {
    const n = params.get('number');
    const e = params.get('email');
    if (n && e) void submit(n, e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(num?: string, mail?: string) {
    const n = (num ?? number).trim();
    const m = (mail ?? email).trim();
    if (!n || !m) return;
    setState('loading');
    setError(null);
    try {
      const res = await api.get<{ data: OrderDTO }>(
        `/api/orders/lookup?number=${encodeURIComponent(n)}&email=${encodeURIComponent(m)}`
      );
      setOrder(res.data);
      setState('ok');
    } catch (err) {
      setOrder(null);
      setState('error');
      setError(err instanceof ApiError ? err.message : 'Recherche impossible pour le moment.');
    }
  }

  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Suivi de commande</h1>
      <p className="mt-2 text-sm text-muted">
        Entrez votre numéro de commande (reçu par email) et l’email utilisé lors de l’achat — aucun compte nécessaire.
      </p>

      <form
        className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label className="field-label" htmlFor="track-number">Numéro de commande</label>
          <input id="track-number" className="field" placeholder="BOR-2026-000001" required value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="track-email">Email</label>
          <input id="track-email" type="email" className="field" placeholder="vous@example.fr" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={state === 'loading'}>
          {state === 'loading' ? 'Recherche…' : 'Suivre'}
        </button>
      </form>

      {state === 'error' && (
        <p role="alert" className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {state === 'ok' && order && (
        <div className="mt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Commande {order.number}</h2>
            <StatusBadge status={order.status} />
          </div>
          <div className="card mb-6 p-6">
            <OrderTimeline order={order} />
          </div>
          <div className="card p-6">
            <h3 className="font-display mb-3 text-base font-semibold">Contenu</h3>
            <ul className="flex flex-col divide-y divide-line text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span>
                    <span className="font-semibold">{it.productName}</span>
                    {it.variantTitle && <span className="text-muted"> — {it.variantTitle}</span>}
                    <span className="text-muted"> ×{it.quantity}</span>
                  </span>
                  <span className="tabular-nums">{formatCents(it.totalCents)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-3 font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatCents(order.totalCents)}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted">Passée le {formatDate(order.placedAt)} · Livraison {order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="container-x grid place-items-center py-24"><Spinner /></div>}>
      <TrackContent />
    </Suspense>
  );
}
