'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui';

interface Subscriber {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  source: string | null;
  created_at: string;
}

export default function AdminNewsletterPage() {
  const [rows, setRows] = useState<Subscriber[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ recipients: number; sentCount: number; failedCount: number } | null>(null);
  const { toast } = useToast();
  const limit = 25;

  const load = async () => {
    try {
      const res = await api.get<{ data: Subscriber[]; total: number }>(
        `/api/admin/newsletter/subscribers?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`
      );
      setRows(res.data);
      setTotal(res.total);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    setRows(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  async function sendCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Envoyer « ${subject} » à tous les abonnés (jusqu’à 100 par envoi) ?\nSans EMAIL_API_KEY configuré, l’envoi sera loggué côté serveur mais PAS délivré.`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api.post<{ data: { recipients: number; sentCount: number; failedCount: number } }>(
        '/api/admin/newsletter/campaigns',
        { subject, html, limit: 100 }
      );
      setResult(res.data);
      toast(`Campagne terminée : ${res.data.sentCount} envoyé(s), ${res.data.failedCount} échec(s).`, res.data.failedCount > 0 ? 'error' : 'success');
      setSubject('');
      setHtml('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    } finally {
      setSending(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Newsletter</h1>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Campagne */}
        <form onSubmit={sendCampaign} className="card h-fit p-6">
          <h2 className="font-display mb-4 text-lg font-semibold">Nouvelle campagne</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label" htmlFor="nl-subject">Sujet *</label>
              <input id="nl-subject" required className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="❄ La sélection grand froid est arrivée" />
            </div>
            <div>
              <label className="field-label" htmlFor="nl-html">Contenu HTML *</label>
              <textarea id="nl-html" required rows={10} className="field resize-y font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)}
                placeholder="<h2 style='font-family:Georgia,serif;'>Titre</h2><p>Votre texte…</p><p><a href='https://VOTRE-DOMAINE/collections' style='color:#E8622C;'>Voir la collection</a></p>" />
            </div>
            {result && (
              <p className={`text-xs font-semibold ${result.failedCount > 0 ? 'text-danger' : 'text-success'}`}>
                Dernier envoi : {result.recipients} destinataire(s), {result.sentCount} envoyé(s), {result.failedCount} échec(s).
              </p>
            )}
            <button type="submit" disabled={sending} className="btn-dark">{sending ? 'Envoi en cours…' : 'Envoyer la campagne'}</button>
            <p className="text-[11px] leading-relaxed text-muted">
              Envoi réel via Resend aux abonnés actifs (100 max par envoi, relancer pour la suite). Le lien de
              désinscription signé est ajouté automatiquement en pied d’email. Sans EMAIL_API_KEY : logs serveur
              uniquement (rien n’est délivré).
            </p>
          </div>
        </form>

        {/* Abonnés */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Abonnés ({total})</h2>
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); }} className="w-56">
              <label htmlFor="nlq" className="sr-only">Filtrer</label>
              <input id="nlq" className="field py-2 text-sm" placeholder="Filtrer par email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          </div>
          {!rows ? (
            <Spinner label="Chargement…" />
          ) : rows.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">Aucun abonné pour le moment — les inscriptions arrivent via la homepage et le checkout.</p>
          ) : (
            <>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((s) => (
                      <tr key={s.id} className="transition hover:bg-snow">
                        <td className="px-4 py-3 font-medium">{s.email}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${s.status === 'subscribed' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                            {s.status === 'subscribed' ? 'Abonné' : 'Désabonné'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{s.source ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted">{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                  <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
                  <span className="text-xs text-muted">Page {page} / {pages}</span>
                  <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
