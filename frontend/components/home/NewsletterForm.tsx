'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { submitNewsletter } from '@/lib/services/actions';

/** Inscription newsletter — appel réel à l'API, aucun compteur/abonné fictif. */
export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'preview' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const result = await submitNewsletter(email, compact ? 'footer' : 'homepage');
      setState(result.status === 'ok' ? 'done' : 'preview');
      setMessage(result.message);
      if (result.status === 'ok') setEmail('');
    } catch (err) {
      setState('error');
      setMessage(
        err instanceof ApiError
          ? err.code === 'network_error' || err.status === 503
            ? 'Service temporairement indisponible. Réessayez plus tard.'
            : err.message
          : 'Erreur inattendue.'
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <label htmlFor={compact ? 'nl-email-c' : 'nl-email'} className="sr-only">
        Votre email
      </label>
      <input
        id={compact ? 'nl-email-c' : 'nl-email'}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.fr"
        autoComplete="email"
        className="field flex-1"
        disabled={state === 'loading'}
      />
      <button type="submit" className="btn-primary shrink-0" disabled={state === 'loading' || state === 'done'}>
        {state === 'loading' ? 'Envoi…' : state === 'done' ? 'Inscrit ✓' : "S'inscrire"}
      </button>
      {message && (
        <p
          role="status"
          className={`text-xs sm:basis-full ${state === 'done' ? 'text-success' : state === 'preview' ? 'text-ink-500' : 'text-danger'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
