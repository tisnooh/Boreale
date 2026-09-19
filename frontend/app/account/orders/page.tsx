'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';
import { EmptyState, Spinner, StatusBadge } from '@/components/ui';

export default function AccountOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ data: OrderDTO[] }>('/api/me/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]));
  }, [user]);

  if (authLoading || (user && orders === null)) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Chargement de vos commandes…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-x py-14">
        <EmptyState
          title="Connexion requise"
          text="Connectez-vous pour voir vos commandes, ou suivez une commande invité avec votre numéro et votre email."
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

  return (
    <div className="container-x py-12">
      <h1 className="font-display mb-8 text-3xl font-semibold">Mes commandes</h1>
      {orders && orders.length === 0 ? (
        <EmptyState
          title="Aucune commande pour l’instant"
          text="Votre historique apparaîtra ici dès votre premier achat."
          action={<Link href="/collections" className="btn-primary btn-sm">Découvrir la collection</Link>}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {(orders ?? []).map((o) => (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/order/${o.id}`} className="font-bold hover:text-ember-dark">
                    {o.number}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(o.placedAt)} · {o.items.length} article{o.items.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold tabular-nums">{formatCents(o.totalCents)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
