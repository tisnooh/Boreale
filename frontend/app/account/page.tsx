'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { previewAuthError } from '@/lib/services/actions';
import { formatDate } from '@/lib/format';
import { Spinner } from '@/components/ui';
import { PackageIcon } from '@/components/Icons';

type Mode = 'login' | 'register';

export default function AccountPage() {
  const { user, loading, login, register, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [optin, setOptin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Édition profil
  const [editing, setEditing] = useState(false);
  const [pf, setPf] = useState({ firstName: '', lastName: '', phone: '' });

  async function onAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const guard = previewAuthError();
    if (guard) {
      setError(guard.message);
      setBusy(false);
      return;
    }
    try {
      if (mode === 'login') {
        await login(email, password);
        toast('Connexion réussie. Bienvenue !', 'success');
      } else {
        await register({ email, password, firstName: firstName || undefined, lastName: lastName || undefined, marketingOptin: optin });
        toast('Compte créé. Bienvenue chez BORÉALE !', 'success');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile({ firstName: pf.firstName, lastName: pf.lastName, phone: pf.phone });
      setEditing(false);
      toast('Profil mis à jour.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Chargement de votre compte…" />
      </div>
    );
  }

  /* ---------- non connecté : login / register ---------- */
  if (!user) {
    return (
      <div className="container-x flex justify-center py-14">
        <div className="card w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-semibold">Mon compte</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'login' ? 'Connectez-vous pour retrouver vos commandes.' : 'Créez un compte en 30 secondes.'}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-ice p-1 text-sm font-semibold">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                aria-pressed={mode === m}
                className={`rounded-lg py-2 transition ${mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={onAuthSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="reg-first">Prénom</label>
                  <input id="reg-first" className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <label className="field-label" htmlFor="reg-last">Nom</label>
                  <input id="reg-last" className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                </div>
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="auth-email">Email *</label>
              <input id="auth-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="field-label" htmlFor="auth-password">Mot de passe *</label>
              <input id="auth-password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined} />
              {mode === 'register' && (
                <p className="mt-1 text-[11px] text-muted">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
              )}
            </div>
            {mode === 'register' && (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input type="checkbox" checked={optin} onChange={(e) => setOptin(e.target.checked)} className="mt-0.5 accent-[#E8622C]" />
                Je souhaite recevoir la newsletter (conseils chaleur + offres, 1 email/mois max, désinscription en un clic).
              </label>
            )}
            {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
            Vos identifiants sont chiffrés côté serveur. Vous pouvez aussi{' '}
            <Link href="/track-order" className="font-semibold text-ink underline underline-offset-2">suivre une commande sans compte</Link>.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- connecté ---------- */
  return (
    <div className="container-x py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Bonjour {user.firstName || user.email.split('@')[0]} ❄</h1>
          <p className="mt-1 text-sm text-muted">Membre depuis {formatDate(user.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/account/orders" className="btn-outline btn-sm">Mes commandes</Link>
          <button
            type="button"
            className="btn-ghost btn-sm text-danger hover:bg-danger/10"
            onClick={async () => { await logout(); toast('Vous êtes déconnecté.', 'info'); }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil */}
        <section className="card p-6" aria-label="Mon profil">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Mon profil</h2>
            {!editing && (
              <button type="button" className="btn-ghost btn-sm"
                onClick={() => { setPf({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', phone: '' }); setEditing(true); }}>
                Modifier
              </button>
            )}
          </div>
          {editing ? (
            <form onSubmit={onSaveProfile} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="pf-first">Prénom</label>
                  <input id="pf-first" className="field" value={pf.firstName} onChange={(e) => setPf({ ...pf, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="pf-last">Nom</label>
                  <input id="pf-last" className="field" value={pf.lastName} onChange={(e) => setPf({ ...pf, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="pf-phone">Téléphone</label>
                <input id="pf-phone" type="tel" className="field" value={pf.phone} onChange={(e) => setPf({ ...pf, phone: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary btn-sm">Enregistrer</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Annuler</button>
              </div>
            </form>
          ) : (
            <dl className="text-sm">
              <div className="flex justify-between border-b border-line py-2"><dt className="text-muted">Email</dt><dd className="font-medium">{user.email}</dd></div>
              <div className="flex justify-between border-b border-line py-2"><dt className="text-muted">Prénom</dt><dd className="font-medium">{user.firstName ?? '—'}</dd></div>
              <div className="flex justify-between border-b border-line py-2"><dt className="text-muted">Nom</dt><dd className="font-medium">{user.lastName ?? '—'}</dd></div>
              <div className="flex justify-between py-2">
                <dt className="text-muted">Newsletter</dt>
                <dd className="font-medium">{user.marketingOptin ? 'Inscrit(e)' : 'Non inscrit(e)'}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* Commandes récentes */}
        <section className="card p-6" aria-label="Dernières commandes">
          <h2 className="font-display mb-4 text-lg font-semibold">Vos commandes</h2>
          <Link href="/account/orders" className="btn-outline btn-sm inline-flex">
            <PackageIcon width={15} height={15} /> Voir l’historique complet
          </Link>
          <p className="mt-4 text-xs text-muted">
            Chaque commande est suivie par email : confirmation, expédition avec numéro de suivi, livraison.
          </p>
        </section>
      </div>
    </div>
  );
}
