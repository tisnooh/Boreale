'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En production, brancher ici l'outil de monitoring choisi (ex. Sentry) — aucun service fictif n'est appelé.
    console.error(error);
  }, [error]);

  return (
    <div className="container-x grid place-items-center py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Nous n’avons pas pu afficher cette page. Essayez de recharger — si le problème persiste, écrivez-nous et
        indiquez la référence {error.digest ?? 'n/a'}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary btn-sm">
          Réessayer
        </button>
        <Link href="/" className="btn-outline btn-sm">Retour à l’accueil</Link>
        <Link href="/contact" className="btn-ghost btn-sm">Contacter le support</Link>
      </div>
    </div>
  );
}
