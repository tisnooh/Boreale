'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isAlibabaUrl, sourcingError, type SourcingCandidate } from '@/lib/admin-sourcing';
import { Spinner } from '@/components/ui';

const BASE = '/api/admin/sourcing-candidates';
const NOTICE = 'Données fournisseur non vérifiées. Brouillon inactif, non vendable. Prix, stock et conformité : Non confirmé.';

function SourceLink({ url, children }: { url: string; children: React.ReactNode }) {
  return isAlibabaUrl(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-ember-dark underline">{children} ↗</a> : <span>Non confirmé</span>;
}

export function SourcingList() {
  const [rows, setRows] = useState<SourcingCandidate[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get<{ data: SourcingCandidate[] }>(BASE)
      .then((res) => { if (active) setRows(res.data); })
      .catch((err) => { if (active) setError(sourcingError(err)); });
    return () => { active = false; };
  }, []);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-semibold">Sourcing fournisseur</h1>
      <Link href="/admin/sourcing/nouveau" className="btn-primary btn-sm">+ Nouveau dossier</Link>
    </div>
    <p className="card p-4 text-sm text-muted">{NOTICE}</p>
    {error ? <p role="alert" className="card p-4 text-danger">{error}</p> : rows === null ? <Spinner label="Chargement des dossiers sourcing…" /> : rows.length === 0 ? <p className="card p-8 text-sm text-muted">Aucun dossier sourcing enregistré.</p> :
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-line"><th className="p-4">Dossier</th><th className="p-4">Fournisseur</th><th className="p-4">État</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.candidate_key} className="border-b border-line">
          <td className="p-4"><Link href={`/admin/sourcing/${encodeURIComponent(row.candidate_key)}`} className="font-bold hover:text-ember-dark">{row.title || 'Non confirmé'}</Link><p className="text-xs text-muted">{row.candidate_key}</p></td>
          <td className="p-4">{row.supplier_name || 'Non confirmé'}<p><SourceLink url={row.source_url}>Source Alibaba</SourceLink></p></td>
          <td className="p-4"><span className="badge bg-cream text-ink-500">Brouillon fournisseur — non vendable</span></td>
        </tr>)}</tbody>
      </table></div>}
  </div>;
}

interface MetadataForm {
  candidateKey: string; title: string; supplierName: string; supplierUrl: string;
  sourceProductId: string; sourceUrl: string; observedAt: string;
  observedFacts: string; missingEvidence: string; notes: string;
}
const EMPTY: MetadataForm = {
  candidateKey: '', title: '', supplierName: '', supplierUrl: '', sourceProductId: '',
  sourceUrl: '', observedAt: '', observedFacts: '{}', missingEvidence: '', notes: '',
};
function fromRow(row: SourcingCandidate): MetadataForm {
  return {
    candidateKey: row.candidate_key, title: row.title, supplierName: row.supplier_name,
    supplierUrl: row.supplier_url, sourceProductId: row.source_product_id,
    sourceUrl: row.source_url, observedAt: row.observed_at,
    observedFacts: JSON.stringify(row.observed_facts, null, 2),
    missingEvidence: row.missing_evidence.join('\n'), notes: row.notes ?? '',
  };
}

export function SourcingForm({ candidateKey }: { candidateKey?: string }) {
  const [form, setForm] = useState<MetadataForm>(EMPTY);
  const [row, setRow] = useState<SourcingCandidate | null>(null);
  const [loading, setLoading] = useState(Boolean(candidateKey));
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  useEffect(() => {
    if (!candidateKey) return;
    let active = true;
    api.get<{ data: SourcingCandidate }>(`${BASE}/${encodeURIComponent(candidateKey)}`)
      .then((res) => { if (active) { setRow(res.data); setForm(fromRow(res.data)); } })
      .catch((err) => { if (active) setLoadError(sourcingError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [candidateKey]);

  function set(key: keyof MetadataForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved('');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setSaved('');
    let observedFacts: Record<string, unknown>;
    try {
      const facts: unknown = JSON.parse(form.observedFacts);
      if (!facts || typeof facts !== 'object' || Array.isArray(facts)) throw new Error();
      observedFacts = facts as Record<string, unknown>;
    } catch { setError('Les faits observés doivent être un objet JSON valide.'); return; }
    if (!isAlibabaUrl(form.sourceUrl) || !isAlibabaUrl(form.supplierUrl)) {
      setError('Les liens fournisseur et source doivent être des URL HTTPS Alibaba.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.observedAt) || !Number.isFinite(Date.parse(form.observedAt))) { setError('Renseignez une date d’observation valide (AAAA-MM-JJ).'); return; }
    const payload = {
      candidateKey: form.candidateKey.trim(), title: form.title.trim(), supplierName: form.supplierName.trim(),
      supplierUrl: form.supplierUrl.trim(), sourcePlatform: 'alibaba' as const,
      sourceProductId: form.sourceProductId.trim(), sourceUrl: form.sourceUrl.trim(),
      observedAt: form.observedAt, observedFacts,
      missingEvidence: form.missingEvidence.split('\n').map((item) => item.trim()).filter(Boolean),
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      const key = row?.candidate_key ?? candidateKey;
      const response = await (key
        ? api.put<{ data: { candidate: SourcingCandidate; product: SourcingCandidate['products']; created: boolean } }>(`${BASE}/${encodeURIComponent(key)}`, payload)
        : api.post<{ data: { candidate: SourcingCandidate; product: SourcingCandidate['products']; created: boolean } }>(BASE, payload));
      setRow({ ...response.data.candidate, products: response.data.product });
      setForm(fromRow(response.data.candidate));
      setSaved(response.data.created ? 'Dossier créé. Produit lié maintenu inactif.' : 'Métadonnées enregistrées. Produit lié maintenu inactif.');
    } catch (err) { setError(sourcingError(err)); }
    finally { setSaving(false); }
  }
  if (loading) return <Spinner label="Chargement du dossier sourcing…" />;
  if (loadError) return <div className="space-y-4"><Link href="/admin/sourcing" className="btn-ghost btn-sm">Retour au sourcing</Link><p role="alert" className="card p-4 text-danger">{loadError}</p></div>;
  const fields: { key: keyof MetadataForm; label: string; pattern?: string; type?: string; maxLength?: number }[] = [
    { key: 'candidateKey', label: 'Référence dossier', pattern: 'BOR-ALI-[0-9]{8}-[0-9]{2}' },
    { key: 'title', label: 'Titre observé', maxLength: 160 }, { key: 'supplierName', label: 'Nom du fournisseur', maxLength: 200 },
    { key: 'supplierUrl', label: 'URL fournisseur Alibaba', type: 'url' },
    { key: 'sourceProductId', label: 'Identifiant produit Alibaba', pattern: '[0-9]{10,20}' },
    { key: 'sourceUrl', label: 'URL source Alibaba', type: 'url' },
    { key: 'observedAt', label: 'Date d’observation', type: 'date' },
  ];
  return <form onSubmit={submit} className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{row ? row.candidate_key : 'Nouveau dossier sourcing'}</h1><Link href="/admin/sourcing" className="btn-ghost btn-sm">Retour au sourcing</Link></div>
    <p className="card p-4 text-sm text-muted">{NOTICE}</p>
    {error && <p role="alert" className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>}
    {saved && <p role="status" className="card p-4 text-success">{saved}</p>}
    <section className="card grid gap-4 p-6 sm:grid-cols-2">
      <h2 className="col-span-full font-display text-lg font-semibold">Métadonnées observées</h2>
      {(row || candidateKey) && <p className="col-span-full text-sm text-muted">L’origine historique du dossier est conservée : référence, fournisseur et liens source sont en lecture seule. Les observations et preuves restent modifiables.</p>}
      {fields.map(({ key, label, pattern, type, maxLength }) => <div key={key}><label className="field-label" htmlFor={`s-${key}`}>{label} *</label><input id={`s-${key}`} className="field" required type={type ?? 'text'} pattern={pattern} maxLength={maxLength} readOnly={Boolean(row || candidateKey) && ['candidateKey', 'supplierName', 'supplierUrl', 'sourceProductId', 'sourceUrl'].includes(key)} value={form[key]} onChange={(event) => set(key, event.target.value)} /></div>)}
      <p className="text-sm text-muted">Plateforme : Alibaba · État : non vérifié</p>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="s-facts">Faits observés (objet JSON, sans supposition)</label><textarea id="s-facts" rows={8} className="field font-mono" value={form.observedFacts} onChange={(event) => set('observedFacts', event.target.value)} /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="s-evidence">Preuves manquantes (une par ligne)</label><textarea id="s-evidence" rows={4} className="field" value={form.missingEvidence} onChange={(event) => set('missingEvidence', event.target.value)} /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="s-notes">Notes</label><textarea id="s-notes" rows={4} className="field" value={form.notes} onChange={(event) => set('notes', event.target.value)} /></div>
    </section>
    {row && <section className="card space-y-2 p-6 text-sm"><h2 className="font-display text-lg font-semibold">Références enregistrées</h2><p><SourceLink url={row.source_url}>Fiche source</SourceLink> · <SourceLink url={row.supplier_url}>Fournisseur</SourceLink></p><p>Produit lié : {row.products?.name || 'Non confirmé'}</p><p>Identifiant : {row.product_id || 'Non confirmé'}</p><p>Dernière mise à jour : {row.updated_at || 'Non confirmé'}</p></section>}
    <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Enregistrement…' : 'Enregistrer les métadonnées'}</button>
  </form>;
}
