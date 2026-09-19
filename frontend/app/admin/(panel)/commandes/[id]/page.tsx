'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatCents, formatDateTime } from '@/lib/format';
import type { OrderDTO, OrderStatus } from '@/lib/types';
import { Spinner, StatusBadge } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';

interface OrderDetail extends OrderDTO {
  events: { id: number; type: string; data: unknown; created_at: string }[];
  payment: { id: string; status: string; stripe_payment_intent_id: string | null; amount_cents: number; refunded_cents: number } | null;
}

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_refunded', 'refunded'];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // statut
  const [newStatus, setNewStatus] = useState<OrderStatus>('processing');
  const [carrier, setCarrier] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  // remboursement
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = async () => {
    if (!id) return;
    try {
      const res = await api.get<{ data: OrderDetail }>(`/api/admin/orders/${id}`);
      setOrder(res.data);
      setNewStatus(res.data.status === 'paid' ? 'processing' : res.data.status);
      setCarrier(res.data.tracking.carrier ?? '');
      setTrackNumber(res.data.tracking.number ?? '');
      setTrackUrl(res.data.tracking.url ?? '');
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner label="Chargement de la commande…" />;
  if (error || !order) return <p className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error ?? 'Commande introuvable.'}</p>;

  const remainingRefundable = order.payment ? order.payment.amount_cents - order.payment.refunded_cents : 0;

  async function updateStatus(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/admin/orders/${order!.id}/status`, {
        status: newStatus,
        trackingCarrier: carrier || null,
        trackingNumber: trackNumber || null,
        trackingUrl: trackUrl || null,
        notify,
      });
      toast('Statut mis à jour.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function refund(e: React.FormEvent) {
    e.preventDefault();
    const cents = refundAmount ? Math.round(parseFloat(refundAmount.replace(',', '.')) * 100) : undefined;
    const label = cents === undefined ? `le remboursement TOTAL (${formatCents(remainingRefundable)})` : `un remboursement de ${formatCents(cents)}`;
    if (!window.confirm(`Confirmer ${label} ? Cette action crée un remboursement Stripe réel.`)) return;
    setRefunding(true);
    try {
      await api.post(`/api/admin/orders/${order!.id}/refund`, { amountCents: cents, reason: 'Remboursement admin' });
      toast('Remboursement initié chez Stripe. Le statut et l’email client suivent via le webhook charge.refunded.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div>
      <nav className="mb-4 text-xs text-muted">
        <Link href="/admin/commandes" className="hover:text-ember-dark">← Commandes</Link>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          {/* Articles */}
          <section className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Articles</h2>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span>
                    <span className="font-semibold">{it.productName}</span>
                    {it.variantTitle && <span className="text-muted"> — {it.variantTitle}</span>}
                    <span className="block text-xs text-muted">{it.sku} · {formatCents(it.unitPriceCents)} × {it.quantity}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatCents(it.totalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between text-success"><dt>Remise {order.discountCode}</dt><dd className="tabular-nums">− {formatCents(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Livraison ({order.shippingMethod})</dt><dd className="tabular-nums">{order.shippingCents === 0 ? 'Offerte' : formatCents(order.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCents(order.totalCents)}</dd></div>
            </dl>
            {order.payment && (
              <p className="mt-3 text-xs text-muted">
                Paiement : <strong>{order.payment.status}</strong>
                {order.payment.stripe_payment_intent_id && <> · intent <code>{order.payment.stripe_payment_intent_id}</code></>}
                {order.payment.refunded_cents > 0 && <> · remboursé {formatCents(order.payment.refunded_cents)}</>}
              </p>
            )}
          </section>

          {/* Statut + suivi */}
          <section className="card p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Statut & expédition</h2>
            <form onSubmit={updateStatus} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="status">Nouveau statut</label>
                <select id="status" className="field" value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-muted">Transitions autorisées : pending→paid/cancelled · paid→processing/shipped/cancelled/refunded · shipped→delivered…</p>
              </div>
              <div>
                <label className="field-label" htmlFor="carrier">Transporteur</label>
                <input id="carrier" className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Colissimo, Mondial Relay…" />
              </div>
              <div>
                <label className="field-label" htmlFor="track-num">N° de suivi</label>
                <input id="track-num" className="field" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="track-url">URL de suivi</label>
                <input id="track-url" type="url" className="field" value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#E8622C]" />
                Envoyer l’email d’expédition au client (si statut = shipped)
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy} className="btn-dark">{busy ? 'Mise à jour…' : 'Mettre à jour'}</button>
              </div>
            </form>
          </section>

          {/* Remboursement */}
          {remainingRefundable > 0 && order.payment?.stripe_payment_intent_id && (
            <section className="card p-6">
              <h2 className="font-display mb-2 text-lg font-semibold">Remboursement</h2>
              <p className="mb-4 text-xs text-muted">Remboursable restant : <strong>{formatCents(remainingRefundable)}</strong>. Laisse vide pour un remboursement total.</p>
              <form onSubmit={refund} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="field-label" htmlFor="refund-amount">Montant (€)</label>
                  <input id="refund-amount" className="field w-40" inputMode="decimal" placeholder={String((remainingRefundable / 100).toFixed(2))} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                </div>
                <button type="submit" disabled={refunding} className="btn bg-danger text-white hover:opacity-90">
                  {refunding ? 'Remboursement…' : 'Rembourser via Stripe'}
                </button>
              </form>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="card p-6">
            <h2 className="font-display mb-3 text-lg font-semibold">Client</h2>
            <p className="text-sm">
              <strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong><br />
              <span className="text-muted">{order.email}</span>
              {order.shippingAddress.phone && <><br /><span className="text-muted">{order.shippingAddress.phone}</span></>}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {order.shippingAddress.line1}<br />
              {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
              {order.shippingAddress.postalCode} {order.shippingAddress.city}<br />
              {order.shippingAddress.country}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-display mb-3 text-lg font-semibold">Historique</h2>
            <ol className="flex flex-col gap-2 text-xs">
              {order.events.length === 0 && <li className="text-muted">Aucun événement.</li>}
              {order.events.map((ev) => (
                <li key={ev.id} className="flex items-baseline justify-between gap-2 border-b border-line pb-2 last:border-0">
                  <span className="font-semibold">{ev.type}</span>
                  <span className="text-muted">{formatDateTime(ev.created_at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
