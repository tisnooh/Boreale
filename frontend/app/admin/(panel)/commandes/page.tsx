'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
  const limit = 25;

  const load = useCallback(async () => {
    setOrders(null);
    try {
      const res = await api.get<{ data: OrderDTO[]; total: number }>(
        `/api/admin/orders?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
      );
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      setOrders([]);
    }
  }, [page, status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Commandes ({total})</h1>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }}
        >
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <input id="q" className="field" placeholder="Numéro ou email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div>
          <label htmlFor="status-filter" className="sr-only">Filtrer par statut</label>
          <select
            id="status-filter"
            className="field w-auto"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === '' ? 'Tous les statuts' : ORDER_STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {!orders ? (
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
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCents(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
          <span className="text-xs text-muted">Page {page} / {pages}</span>
          <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}
