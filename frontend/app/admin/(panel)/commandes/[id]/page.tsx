'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderDTO, OrderStatus } from '@/lib/types';
import { Spinner, StatusBadge } from '@/components/ui';

interface OrderDetail extends OrderDTO {
  events: { id: number; type: string; data: unknown; created_at: string }[];
  payment: { status: string; stripe_payment_intent_id: string | null; amount_cents: number; refunded_cents: number } | null;
  incidents: { id: string; code: string; status: string; owner_role: string; next_action: string; created_at: string }[];
  notifications: { id: string; type: string; status: string; attempts: number; last_error: string | null; sent_at: string | null }[];
  capabilities: { allowedStatuses: OrderStatus[]; canEditTracking: boolean; canAddNote: boolean; refund: { enabled: boolean; reason: string }; notifications: { enabled: boolean; reason: string } };
}
const fulfillmentLabels = { pending: 'En attente', ready: 'Prête à traiter', blocked: 'Bloquée' };
const eventLabels: Record<string, string> = { admin_cancellation: 'Annulation administrative', status_processing: 'En préparation', status_shipped: 'Expédiée', status_delivered: 'Livrée', order_cancelled: 'Commande annulée', created: 'Commande créée', status_changed: 'Statut modifié', tracking_updated: 'Suivi modifié', admin_note: 'Note interne', payment_settled: 'Paiement enregistré', cancelled: 'Commande annulée' };
function eventText(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const row = data as Record<string, unknown>;
  return ['note', 'from', 'to', 'actor', 'by', 'reason'].flatMap((key) => typeof row[key] === 'string' ? [`${key === 'actor' || key === 'by' ? 'Par' : key === 'from' ? 'De' : key === 'to' ? 'Vers' : key === 'reason' ? 'Motif' : 'Note'} : ${key === 'from' || key === 'to' ? ORDER_STATUS_LABELS[row[key] as string] ?? row[key] : row[key]}`] : []);
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [carrier, setCarrier] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    let current = true;
    setId(null); setOrder(null); setLoading(true); setError(null); setNote(''); setBusy(null); setNotice(null); setActionError(null);
    generation.current++;
    void params.then((p) => { if (current) setId(p.id); }).catch(() => { if (current) { setError('Commande introuvable.'); setLoading(false); } });
    return () => { current = false; generation.current++; };
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let current = true;
    setLoading(true); setError(null);
    void api.get<{ data: OrderDetail }>(`/api/admin/orders/${encodeURIComponent(id)}`).then(({ data }) => {
      if (!current) return;
      setOrder(data); setNewStatus(data.capabilities.allowedStatuses[0] ?? '');
      setCarrier(data.tracking.carrier ?? ''); setTrackNumber(data.tracking.number ?? ''); setTrackUrl(data.tracking.url ?? '');
    }).catch((e) => { if (current) setError(e instanceof Error ? e.message : 'Chargement impossible.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, reload]);

  async function submit(action: 'status' | 'tracking' | 'notes') {
    if (!order || busy) return;
    const version = generation.current;
    const tracking = { trackingCarrier: carrier.trim() || null, trackingNumber: trackNumber.trim() || null, trackingUrl: trackUrl.trim() || null };
    const body = action === 'notes' ? { note: note.trim() } : action === 'tracking'
      ? { expectedStatus: order.status, expectedTracking: order.tracking, ...tracking }
      : { status: newStatus, expectedStatus: order.status, ...(newStatus === 'shipped' ? tracking : {}), notify: false };
    setBusy(action); setActionError(null); setNotice(null);
    try {
      await api.post(`/api/admin/orders/${encodeURIComponent(order.id)}/${action}`, body);
      if (version !== generation.current) return;
      if (action === 'notes') setNote('');
      setNotice(action === 'notes' ? 'Note enregistrée.' : action === 'tracking' ? 'Suivi enregistré.' : 'Statut enregistré.');
      setReload((n) => n + 1);
    } catch (e) {
      if (version === generation.current) setActionError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally { if (version === generation.current) setBusy(null); }
  }

  if (loading) return <Spinner label="Chargement de la commande…" />;
  if (error || !order) return <div role="alert" className="card p-6"><p className="text-sm text-danger">{error ?? 'Commande introuvable.'}</p><button className="btn-outline btn-sm mt-3" onClick={() => setReload((n) => n + 1)}>Réessayer</button><Link className="ml-3 text-sm underline" href="/admin/commandes">Commandes</Link></div>;
  const canAdvance = order.capabilities.allowedStatuses.length > 0;
  const showTracking = order.capabilities.canEditTracking || order.capabilities.allowedStatuses.includes('shipped');
  return (
    <div className="min-w-0">
      <nav className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted"><Link href="/admin/commandes" className="hover:text-ember-dark">← Commandes</Link><button type="button" disabled={!!busy} className="btn-outline btn-sm" onClick={() => { setActionError(null); setNotice(null); setReload((n) => n + 1); }}>Recharger la commande</button></nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display min-w-0 break-all text-2xl font-semibold">{order.number}</h1><StatusBadge status={order.status} /></div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-success/10 p-4 text-sm text-success">{notice}</p>}
      {actionError && <p role="alert" className="mb-4 rounded-xl bg-danger/10 p-4 text-sm text-danger">{actionError} Les champs saisis sont conservés. Rechargez la commande avant de réessayer si elle a changé.</p>}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="card min-w-0 p-4 sm:p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Articles</h2>
            <ul className="divide-y divide-line text-sm">{order.items.map((it, i) => <li key={`${it.sku}-${i}`} className="flex flex-wrap justify-between gap-3 py-3"><span className="min-w-0 break-words"><strong>{it.productName}</strong>{it.variantTitle && <> — {it.variantTitle}</>}<span className="block break-all text-xs text-muted">{it.sku} · {formatCents(it.unitPriceCents)} × {it.quantity}</span></span><span className="font-semibold tabular-nums">{formatCents(it.totalCents)}</span></li>)}</ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt>Sous-total</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex flex-wrap justify-between gap-2"><dt>Remise {order.discountCode}</dt><dd>− {formatCents(order.discountCents)}</dd></div>}
              <div className="flex flex-wrap justify-between gap-2"><dt>Livraison ({order.shippingMethod})</dt><dd>{formatCents(order.shippingCents)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 font-bold"><dt>Total</dt><dd>{formatCents(order.totalCents)} {order.currency}</dd></div>
            </dl>
            <p className="mt-4 break-all text-xs text-muted">Paiement : {order.payment?.status ?? 'Aucun paiement enregistré'}{order.payment?.stripe_payment_intent_id && <> · {order.payment.stripe_payment_intent_id}</>}{!!order.payment?.refunded_cents && <> · remboursé {formatCents(order.payment.refunded_cents)}</>}</p>
            <p className="mt-2 text-xs text-muted">{order.capabilities.refund.reason}</p>
          </section>
          <section className="card min-w-0 p-4 sm:p-6">
            <h2 className="font-display mb-2 text-lg font-semibold">Statut & expédition</h2>
            <p className={`mb-4 text-sm ${order.fulfillmentStatus === 'blocked' ? 'text-danger' : 'text-muted'}`}>Préparation : {fulfillmentLabels[order.fulfillmentStatus ?? 'pending']}</p>
            {order.tracking.number && <p className="mb-4 break-all text-sm">Suivi enregistré : {order.tracking.carrier} · {order.tracking.number}</p>}
            <form onSubmit={(e) => { e.preventDefault(); void submit('status'); }} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement && order.capabilities.canEditTracking) { e.preventDefault(); if (e.currentTarget.reportValidity()) void submit('tracking'); } }} className="grid min-w-0 gap-4 sm:grid-cols-2">
              {canAdvance ? <div className="min-w-0 sm:col-span-2"><label className="field-label" htmlFor="status">Nouveau statut</label><select id="status" className="field" value={newStatus} disabled={!!busy} onChange={(e) => setNewStatus(e.target.value as OrderStatus)}>{order.capabilities.allowedStatuses.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}</select></div> : <p className="text-sm text-muted sm:col-span-2">Aucun changement de statut autorisé pour cette commande.</p>}
              {showTracking && <><div className="min-w-0"><label className="field-label" htmlFor="carrier">Transporteur</label><input id="carrier" className="field" maxLength={80} disabled={!!busy} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div><div className="min-w-0"><label className="field-label" htmlFor="track-num">N° de suivi</label><input id="track-num" className="field" maxLength={120} disabled={!!busy} value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} /></div><div className="min-w-0 sm:col-span-2"><label className="field-label" htmlFor="track-url">URL de suivi (https:// ou http://)</label><input id="track-url" type="url" pattern="https?://.*" className="field" maxLength={500} disabled={!!busy} value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} /></div></>}
              <p className="text-xs text-muted sm:col-span-2">{order.capabilities.notifications.reason}</p>
              <div className="flex flex-wrap gap-3 sm:col-span-2">{canAdvance && <button type="submit" disabled={!!busy} className="btn-dark">{busy === 'status' ? 'Enregistrement…' : 'Enregistrer le statut'}</button>}{order.capabilities.canEditTracking && <button type="button" disabled={!!busy} onClick={(e) => { if (e.currentTarget.form?.reportValidity()) void submit('tracking'); }} className="btn-outline">{busy === 'tracking' ? 'Enregistrement…' : 'Enregistrer le suivi'}</button>}</div>
            </form>
          </section>
          <section className="card min-w-0 p-4 sm:p-6"><h2 className="font-display mb-3 text-lg font-semibold">Incidents opérationnels</h2>{order.incidents.length === 0 ? <p className="text-sm text-muted">Aucun incident enregistré.</p> : <ul className="space-y-4">{order.incidents.map((incident) => <li key={incident.id} className="break-words border-b border-line pb-3 text-sm"><strong>{incident.code}</strong> · {incident.status === 'open' ? 'Ouvert' : 'Résolu'}<p>Responsable : {incident.owner_role}</p><p>Prochaine action : {incident.next_action}</p><p className="mt-1 text-xs text-muted">{formatDateTime(incident.created_at)}</p></li>)}</ul>}</section>
          <section className="card min-w-0 p-4 sm:p-6"><h2 className="font-display mb-3 text-lg font-semibold">Notes internes</h2>{order.capabilities.canAddNote && <form onSubmit={(e) => { e.preventDefault(); void submit('notes'); }}><label className="field-label" htmlFor="note">Ajouter une note</label><textarea id="note" className="field min-h-28" required maxLength={2000} value={note} disabled={!!busy} onChange={(e) => setNote(e.target.value)} /><p className="my-2 text-xs text-muted">Interne à l’équipe · {note.length}/2000 caractères</p><button type="submit" disabled={!!busy || !note.trim()} className="btn-dark">{busy === 'notes' ? 'Enregistrement…' : 'Ajouter la note'}</button></form>}</section>
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <section className="card min-w-0 break-words p-4 sm:p-6"><h2 className="font-display mb-3 text-lg font-semibold">Client</h2><p className="text-sm"><strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong><br /><span className="break-all text-muted">{order.email}</span>{order.shippingAddress.phone && <><br />{order.shippingAddress.phone}</>}</p><p className="mt-3 text-sm leading-relaxed text-muted">{order.shippingAddress.line1}<br />{order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}{order.shippingAddress.postalCode} {order.shippingAddress.city}<br />{order.shippingAddress.country}</p></section>
          <section className="card min-w-0 p-4 sm:p-6"><h2 className="font-display mb-3 text-lg font-semibold">Notifications</h2>{order.notifications.length === 0 ? <p className="text-sm text-muted">Aucune notification enregistrée.</p> : <ul className="space-y-3 text-xs">{order.notifications.map((n) => <li key={n.id} className="break-words"><strong>{n.type === 'confirmation' || n.type === 'order_confirmation' ? 'Confirmation de commande' : n.type}</strong><p>{({ pending: 'En attente', sending: 'En cours', sent: 'Envoyée', failed: 'Échec' } as Record<string, string>)[n.status] ?? n.status} · {n.attempts} tentative(s)</p>{n.sent_at && <p>{formatDateTime(n.sent_at)}</p>}{n.last_error && <p className="text-danger">{n.last_error}</p>}</li>)}</ul>}</section>
          <section className="card min-w-0 p-4 sm:p-6"><h2 className="font-display mb-3 text-lg font-semibold">Historique</h2><ol className="space-y-4 text-xs">{order.events.length === 0 && <li className="text-muted">Aucun événement.</li>}{order.events.map((ev) => <li key={ev.id} className="break-words border-b border-line pb-3"><strong>{eventLabels[ev.type] ?? ev.type}</strong><p className="mt-1 text-muted">{formatDateTime(ev.created_at)}</p>{eventText(ev.data).map((text, i) => <p key={i} className="mt-1 whitespace-pre-wrap">{text}</p>)}</li>)}</ol></section>
        </aside>
      </div>
    </div>
  );
}
