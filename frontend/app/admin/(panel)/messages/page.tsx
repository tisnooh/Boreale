'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  order_number: string | null;
  handled: boolean;
  created_at: string;
}

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<Message[] | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await api.get<{ data: Message[] }>('/api/admin/messages?page=1&limit=100');
      setRows(res.data);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function markHandled(m: Message) {
    try {
      await api.post(`/api/admin/messages/${m.id}/handled`);
      toast('Message marqué comme traité.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    }
  }

  if (!rows) return <Spinner label="Chargement…" />;

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold">Messages contact ({rows.filter((r) => !r.handled).length} à traiter)</h1>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Aucun message. Les demandes arrivent via /contact.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((m) => (
            <article key={m.id} className={`card p-5 ${m.handled ? 'opacity-60' : ''}`}>
              <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{m.subject}</h2>
                  <p className="text-xs text-muted">
                    {m.name} · <a className="text-ember-dark hover:underline" href={`mailto:${m.email}?subject=${encodeURIComponent('Re : ' + m.subject)}`}>{m.email}</a>
                    {m.order_number && <> · commande <strong>{m.order_number}</strong></>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">{formatDateTime(m.created_at)}</span>
                  {m.handled ? (
                    <span className="badge bg-success/10 text-success">Traité</span>
                  ) : (
                    <button type="button" className="btn-outline btn-sm" onClick={() => void markHandled(m)}>Marquer traité</button>
                  )}
                </div>
              </header>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-500">{m.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
