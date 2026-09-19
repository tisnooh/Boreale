'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { Spinner, StatusBadge } from '@/components/ui';
import type { OrderStatus } from '@/lib/types';

interface Stats {
  revenue: { grossCents: number; refundedCents: number; netCents: number; last30dCents: number };
  orders: { total: number; byStatus: Record<string, number>; aovCents: number };
  series: { date: string; revenueCents: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenueCents: number }[];
  lowStock: { sku: string; product: string; quantity: number; threshold: number }[];
  newsletterSubscribers: number;
  recentOrders: { id: string; number: string; status: OrderStatus; totalCents: number; placedAt: string }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Stats }>('/api/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  if (error) return <p className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  if (!stats) return <Spinner label="Chargement des statistiques…" />;

  const maxSeries = Math.max(1, ...stats.series.map((s) => s.revenueCents));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Dashboard</h1>

      {/* KPIs — chiffres réels issus de la base */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="CA net (total)" value={formatCents(stats.revenue.netCents)} sub={`Brut ${formatCents(stats.revenue.grossCents)} · remboursé ${formatCents(stats.revenue.refundedCents)}`} />
        <Kpi label="CA 30 derniers jours" value={formatCents(stats.revenue.last30dCents)} />
        <Kpi label="Commandes" value={String(stats.orders.total)} sub={`Panier moyen ${formatCents(stats.orders.aovCents)}`} />
        <Kpi label="Newsletter" value={String(stats.newsletterSubscribers)} sub="abonnés actifs" />
      </div>

      {/* Série 14 jours */}
      <section className="card mt-6 p-6" aria-label="Chiffre d'affaires sur 14 jours">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">CA — 14 derniers jours</h2>
        <div className="flex h-32 items-end gap-1.5">
          {stats.series.map((s) => (
            <div key={s.date} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-glacier/80 transition group-hover:bg-ember"
                style={{ height: `${Math.max(2, (s.revenueCents / maxSeries) * 120)}px` }}
                title={`${s.date} : ${formatCents(s.revenueCents)} (${s.orders} commande${s.orders > 1 ? 's' : ''})`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>{stats.series[0]?.date}</span>
          <span>{stats.series[stats.series.length - 1]?.date}</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top produits */}
        <section className="card p-6" aria-label="Meilleures ventes">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Meilleures ventes</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted">Aucune vente enregistrée pour le moment.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ice text-[11px] font-bold text-ink-500">{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    ×{p.quantity} · {formatCents(p.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Stock bas */}
        <section className="card p-6" aria-label="Alertes stock">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Alertes stock bas</h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-muted">Aucune alerte — tous les stocks sont au-dessus du seuil.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.lowStock.map((v) => (
                <li key={v.sku} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{v.product}</span> <span className="text-xs text-muted">({v.sku})</span>
                  </span>
                  <span className={`badge ${v.quantity === 0 ? 'bg-danger/10 text-danger' : 'bg-cream text-ink-500'}`}>
                    {v.quantity} / seuil {v.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/produits" className="btn-outline btn-sm mt-4">Gérer les stocks</Link>
        </section>
      </div>

      {/* Commandes récentes */}
      <section className="card mt-6 p-6" aria-label="Commandes récentes">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Commandes récentes</h2>
          <Link href="/admin/commandes" className="text-xs font-semibold text-ember-dark hover:underline">Tout voir →</Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-muted">Aucune commande pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recentOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link href={`/admin/commandes/${o.id}`} className="font-bold hover:text-ember-dark">{o.number}</Link>
                <span className="text-xs text-muted">{formatDateTime(o.placedAt)}</span>
                <StatusBadge status={o.status} />
                <span className="font-semibold tabular-nums">{formatCents(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Répartition statuts */}
      <section className="card mt-6 p-6" aria-label="Répartition des statuts">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Répartition des statuts</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.orders.byStatus).map(([status, count]) => (
            <span key={status} className="badge bg-ice text-ink-500">
              {ORDER_STATUS_LABELS[status] ?? status} : {count}
            </span>
          ))}
          {Object.keys(stats.orders.byStatus).length === 0 && <p className="text-sm text-muted">—</p>}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
