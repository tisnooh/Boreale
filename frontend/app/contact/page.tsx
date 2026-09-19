'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ApiError } from '@/lib/api';
import { submitContact } from '@/lib/services/actions';

function ContactForm() {
  const params = useSearchParams();
  const router = useRouter();
  void router;
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: params.get('subject') ?? '',
    message: '',
    orderNumber: params.get('order') ?? '',
  });
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'preview' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setError(null);
    try {
      const result = await submitContact({ ...form, orderNumber: form.orderNumber || undefined });
      setState(result.status === 'ok' ? 'done' : 'preview');
    } catch (err) {
      setState('error');
      setError(
        err instanceof ApiError
          ? err.code === 'rate_limited'
            ? 'Trop de messages envoyés récemment. Réessayez dans une heure.'
            : err.message
          : 'Erreur inattendue.'
      );
    }
  }

  if (state === 'preview') {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-2xl font-semibold">Mode preview</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Votre message n’a pas été envoyé : aucun service client n’est connecté dans ce mode. Le formulaire sera
          actif à l’ouverture de la boutique.
        </p>
        <button type="button" className="btn-outline btn-sm mt-6" onClick={() => setState('idle')}>
          Modifier le message
        </button>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-2xl font-semibold">Message envoyé ✓</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Merci ! Notre équipe répond sous 24-48 h ouvrées à l’adresse indiquée. Pour une commande urgente, précisez
          toujours le numéro de commande.
        </p>
        <button type="button" className="btn-outline btn-sm mt-6" onClick={() => { setState('idle'); setForm({ name: '', email: '', subject: '', message: '', orderNumber: '' }); }}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="c-name">Nom *</label>
        <input id="c-name" required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
      </div>
      <div>
        <label className="field-label" htmlFor="c-email">Email *</label>
        <input id="c-email" type="email" required className="field" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="c-subject">Sujet *</label>
        <input id="c-subject" required className="field" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Question produit, commande, retour…" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="c-order">Numéro de commande (si concerné)</label>
        <input id="c-order" className="field" value={form.orderNumber} onChange={(e) => set('orderNumber', e.target.value)} placeholder="BOR-2026-000001" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="c-message">Message *</label>
        <textarea id="c-message" required rows={6} className="field resize-y" value={form.message} onChange={(e) => set('message', e.target.value)} minLength={10} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === 'loading'} className="btn-primary w-full sm:w-auto">
          {state === 'loading' ? 'Envoi…' : 'Envoyer le message'}
        </button>
        <p className="mt-3 text-[11px] text-muted">
          Vos données sont utilisées uniquement pour traiter votre demande (voir la politique de confidentialité).
        </p>
      </div>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Contact</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Une question, un souci de commande, un conseil produit ? Écrivez-nous — une vraie personne répond sous 24-48 h
        ouvrées. Vous pouvez aussi nous joindre par email à{' '}
        <a href="mailto:bonjour@votre-domaine.fr" className="font-semibold text-ember-dark underline underline-offset-2">
          bonjour@votre-domaine.fr
        </a>
        .
      </p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </div>
    </div>
  );
}
