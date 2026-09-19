'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import { Spinner } from '@/components/ui';

interface CustomerRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  ordersCount: number;
  totalSpentCents: number;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const limit = 25;

  useEffect(() => {
    (async () => {
      setRows(null);
      try {
        const res = await api.get<{ data: CustomerRow[]; total: number }>(
          `/api/admin/customers?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`
        );
        setRows(res.data);
        setTotal(res.total);
      } catch {
        setRows([]);
      }
    })();
  }, [page, q]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Clients ({total})</h1>
      <form className="mb-5 max-w-sm" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
        <label htmlFor="cq" className="sr-only">Rechercher un client</label>
        <input id="cq" className="field" placeholder="Email, nom…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      {!rows ? (
        <Spinner label="Chargement…" />
      ) : rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Aucun client pour le moment.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3 text-right">Commandes</th>
                <th className="px-4 py-3 text-right">Total dépensé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="transition hover:bg-snow">
                  <td className="px-4 py-3 font-semibold">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.email}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.ordersCount}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCents(c.totalSpentCents)}</td>
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
