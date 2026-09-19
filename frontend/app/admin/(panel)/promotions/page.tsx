'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui';

interface DiscountRow {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  code: '', type: 'percentage' as 'percentage' | 'fixed', value: '10', minSubtotal: '20',
  maxUses: '', startsAt: '', endsAt: '', isActive: true, description: '',
};

export default function AdminPromotionsPage() {
  const [rows, setRows] = useState<DiscountRow[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await api.get<{ data: DiscountRow[] }>('/api/admin/discounts');
      setRows(res.data);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/admin/discounts', {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === 'percentage' ? parseInt(form.value, 10) : Math.round(parseFloat(form.value.replace(',', '.')) * 100),
        minSubtotalCents: Math.round(parseFloat(form.minSubtotal.replace(',', '.')) * 100) || 0,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isActive: form.isActive,
        description: form.description.trim() || null,
      });
      toast('Code promo créé.', 'success');
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: DiscountRow) {
    try {
      await api.put(`/api/admin/discounts/${row.id}`, { isActive: !row.is_active });
      toast(row.is_active ? 'Code désactivé.' : 'Code réactivé.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    }
  }

  async function remove(row: DiscountRow) {
    if (!window.confirm(`Supprimer définitivement le code ${row.code} ?`)) return;
    try {
      await api.del(`/api/admin/discounts/${row.id}`);
      toast('Code supprimé.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    }
  }

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Promotions</h1>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Création */}
        <form onSubmit={create} className="card h-fit p-6">
          <h2 className="font-display mb-4 text-lg font-semibold">Nouveau code</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label" htmlFor="d-code">Code *</label>
              <input id="d-code" required className="field uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HIVER25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="d-type">Type</label>
                <select id="d-type" className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}>
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (€)</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="d-value">Valeur *</label>
                <input id="d-value" required className="field" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="d-min">Minimum d’achat (€)</label>
              <input id="d-min" className="field" inputMode="decimal" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="d-start">Début</label>
                <input id="d-start" type="date" className="field" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="d-end">Fin</label>
                <input id="d-end" type="date" className="field" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="d-max">Utilisations max (vide = illimité)</label>
              <input id="d-max" className="field" inputMode="numeric" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="d-desc">Description (affichée au client)</label>
              <input id="d-desc" className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#E8622C]" /> Actif immédiatement
            </label>
            <button type="submit" disabled={busy} className="btn-dark">{busy ? 'Création…' : 'Créer le code'}</button>
            <p className="text-[11px] leading-relaxed text-muted">
              Pourcentage limité à 90 %. Le compteur d’utilisation est incrémenté au paiement réussi (webhook), pas à la
              création du panier.
            </p>
          </div>
        </form>

        {/* Liste */}
        <div>
          {!rows ? (
            <Spinner label="Chargement…" />
          ) : rows.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">Aucun code promo.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Remise</th>
                    <th className="px-4 py-3">Minimum</th>
                    <th className="px-4 py-3">Validité</th>
                    <th className="px-4 py-3">Usages</th>
                    <th className="px-4 py-3">État</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((d) => (
                    <tr key={d.id} className="transition hover:bg-snow">
                      <td className="px-4 py-3">
                        <span className="font-bold tracking-wide">{d.code}</span>
                        {d.description && <span className="block text-xs text-muted">{d.description}</span>}
                      </td>
                      <td className="px-4 py-3">{d.type === 'percentage' ? `−${d.value} %` : `− ${formatCents(d.value)}`}</td>
                      <td className="px-4 py-3 tabular-nums">{d.min_subtotal_cents > 0 ? formatCents(d.min_subtotal_cents) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {d.starts_at ? formatDate(d.starts_at) : 'immédiat'} → {d.ends_at ? formatDate(d.ends_at) : 'illimité'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ''}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${d.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {d.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => void toggleActive(d)}>
                          {d.is_active ? 'Désactiver' : 'Réactiver'}
                        </button>
                        <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => void remove(d)}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
