'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Spinner } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';

interface AdminVariant {
  id: string;
  sku: string;
  title: string;
  price_cents: number;
  is_active: boolean;
  inventory?: { quantity: number }[] | { quantity: number } | null;
}

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  type: 'product' | 'bundle';
  is_active: boolean;
  is_featured: boolean;
  product_variants?: AdminVariant[];
}

function stockOf(v: AdminVariant): number {
  const inv = v.inventory;
  if (!inv) return 0;
  return Array.isArray(inv) ? inv[0]?.quantity ?? 0 : inv.quantity ?? 0;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await api.get<{ data: AdminProduct[] }>('/api/admin/products');
      setProducts(res.data);
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function remove(p: AdminProduct) {
    if (!window.confirm(`Désactiver « ${p.name} » ? Il disparaîtra de la boutique (réactivable depuis sa page d'édition).`)) return;
    try {
      await api.del(`/api/admin/products/${p.id}`); // soft delete (is_active=false)
      toast('Produit désactivé.', 'success');
      await load();
    } catch {
      toast('Erreur lors de la désactivation.', 'error');
    }
  }

  if (!products) return <Spinner label="Chargement du catalogue…" />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Produits ({products.length})</h1>
        <Link href="/admin/produits/nouveau" className="btn-primary btn-sm">+ Nouveau produit</Link>
      </div>

      {products.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          Aucun produit. Exécutez le seed (backend/supabase/seed.sql) ou créez votre premier produit.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Variantes</th>
                <th className="px-4 py-3">Prix min</th>
                <th className="px-4 py-3">Stock total</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => {
                const variants = p.product_variants ?? [];
                const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price_cents)) : 0;
                const totalStock = variants.reduce((s, v) => s + stockOf(v), 0);
                return (
                  <tr key={p.id} className="transition hover:bg-snow">
                    <td className="px-4 py-3">
                      <Link href={`/admin/produits/${p.id}`} className="font-bold hover:text-ember-dark">{p.name}</Link>
                      <span className="block text-xs text-muted">/{p.slug}{p.is_featured && ' · ★ vedette'}</span>
                    </td>
                    <td className="px-4 py-3"><span className="badge bg-ice text-ink-500">{p.type === 'bundle' ? 'Pack' : 'Produit'}</span></td>
                    <td className="px-4 py-3 tabular-nums">{variants.length}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCents(minPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${totalStock === 0 ? 'bg-danger/10 text-danger' : totalStock <= 20 ? 'bg-cream text-ink-500' : 'bg-success/10 text-success'}`}>
                        {p.type === 'bundle' ? `${totalStock} packs` : `${totalStock} u.`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/produits/${p.id}`} className="btn-outline btn-sm mr-2">Éditer</Link>
                      {p.is_active && (
                        <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => void remove(p)}>Désactiver</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
