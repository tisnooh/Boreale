'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderDTO } from '@/lib/types';
import { Spinner, StatusBadge } from '@/components/ui';

const STATUSES = ['', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const limit = 25;

  useEffect(() => {
    let current = true;
    setOrders(null);
    setError(null);
    setTotal(0);
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) query.set('status', status);
    if (search) query.set('q', search);
    if (fulfillment) query.set('fulfillmentStatus', fulfillment);
    void api.get<{ data: OrderDTO[]; total: number }>(`/api/admin/orders?${query}`).then((res) => {
      if (!current) return;
      setOrders(res.data);
      setTotal(res.total);
    }).catch((e) => {
      if (current) setError(e instanceof Error ? e.message : 'Chargement des commandes impossible.');
    });
    return () => { current = false; };
  }, [page, status, search, fulfillment, attempt]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Commandes{orders && !error ? ` (${total})` : ''}</h1>

      <div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form
          className="flex min-w-0 gap-2 sm:col-span-2 xl:col-span-1"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); setAttempt((n) => n + 1); }}
        >
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <input id="q" className="field min-w-0" maxLength={160} placeholder="Numéro ou email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-outline btn-sm" type="submit">Rechercher</button>
        </form>
        <div className="min-w-0">
          <label htmlFor="status-filter" className="sr-only">Filtrer par statut</label>
          <select
            id="status-filter"
            className="field min-w-0"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === '' ? 'Tous les statuts' : ORDER_STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0"><label htmlFor="fulfillment-filter" className="sr-only">Filtrer par préparation</label><select id="fulfillment-filter" className="field min-w-0" value={fulfillment} onChange={(e) => { setFulfillment(e.target.value); setPage(1); }}><option value="">Toutes les préparations</option><option value="pending">En attente</option><option value="ready">Prête à traiter</option><option value="blocked">Bloquée</option></select></div>
      </div>

      {error ? <div role="alert" className="card p-6"><p className="text-sm text-danger">{error}</p><button type="button" className="btn-outline btn-sm mt-3" onClick={() => setAttempt((n) => n + 1)}>Réessayer</button></div> : !orders ? (
        <Spinner label="Chargement…" />
      ) : orders.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Aucune commande ne correspond.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-snow">
                  <td className="px-4 py-3">
                    <Link href={`/admin/commandes/${o.id}`} className="font-bold hover:text-ember-dark">{o.number}</Link>
                    <span className="block text-xs text-muted">{o.items.length} article{o.items.length > 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDateTime(o.placedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{o.shippingAddress.firstName} {o.shippingAddress.lastName}</span>
                    <span className="block text-xs text-muted">{o.email}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /><span className={`mt-1 block text-xs ${o.fulfillmentStatus === 'blocked' ? 'text-danger' : 'text-muted'}`}>{o.fulfillmentStatus === 'ready' ? 'Prête à traiter' : o.fulfillmentStatus === 'blocked' ? 'Préparation bloquée' : 'Préparation en attente'}</span></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCents(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && orders && pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
          <span className="text-xs text-muted">Page {page} / {pages}</span>
          <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}
