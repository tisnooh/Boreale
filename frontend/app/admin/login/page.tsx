'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { isPreview } from '@/lib/config';
import { LogoMark } from '@/components/layout/Logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/admin/auth/login', { email, password });
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <LogoMark className="h-10 w-10" />
          <h1 className="font-display text-xl font-semibold">Back-office BORÉALE</h1>
          <p className="text-xs text-muted">Accès réservé à l’équipe. Toutes les tentatives sont limitées.</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="admin-email">Email</label>
            <input id="admin-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="field-label" htmlFor="admin-password">Mot de passe</label>
            <input id="admin-password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {isPreview() && (
            <p role="status" className="rounded-xl bg-ice px-4 py-2.5 text-xs font-medium text-ink-500">
              Mode preview : le back-office réel sera accessible une fois l’API backend connectée (mode live).
            </p>
          )}
          {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">{error}</p>}
          <button type="submit" disabled={busy} className="btn-dark w-full">
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Compte admin créé via <code className="rounded bg-ice px-1">npm run admin:create</code> (voir
          backend/README.md). Aucune donnée sensible n’est stockée côté navigateur en clair.
        </p>
      </form>
    </div>
  );
}
