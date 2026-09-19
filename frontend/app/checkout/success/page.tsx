'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Spinner } from '@/components/ui';
import { CheckIcon } from '@/components/Icons';

interface SessionInfo {
  paymentStatus: string;
  amountTotal: number | null;
  customerEmail: string | null;
  orderNumber: string | null;
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setFailed(true);
      return;
    }
    api
      .get<{ data: SessionInfo }>(`/api/stripe/session/${encodeURIComponent(sessionId)}`)
      .then((res) => setSession(res.data))
      .catch(() => setFailed(true));
  }, [sessionId]);

  if (failed || (!session && sessionId === null)) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Page de confirmation</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Impossible de vérifier la session de paiement. Si vous avez été débité, votre commande est enregistrée :
          vous recevrez un email de confirmation. Retrouvez-la aussi via le suivi de commande.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/track-order" className="btn-primary btn-sm">Suivre une commande</Link>
          <Link href="/contact" className="btn-outline btn-sm">Contacter le support</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container-x grid place-items-center py-24">
        <Spinner label="Vérification du paiement…" />
      </div>
    );
  }

  const paid = session.paymentStatus === 'paid';

  return (
    <div className="container-x py-16 text-center">
      <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${paid ? 'bg-success/15 text-success' : 'bg-cream text-ink-500'}`}>
        <CheckIcon width={30} height={30} />
      </span>
      <h1 className="font-display mt-6 text-3xl font-semibold sm:text-4xl">
        {paid ? 'Merci, votre commande est confirmée !' : 'Paiement en cours de traitement'}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
        {paid ? (
          <>
            Un email de confirmation vient de partir{session.customerEmail ? ` vers ${session.customerEmail}` : ''}. Nous
            préparons votre colis avec soin — vous recevrez un email avec le suivi dès l’expédition.
          </>
        ) : (
          <>La confirmation définitive arrive par email dès validation du paiement (quelques secondes en général).</>
        )}
      </p>

      {session.orderNumber && (
        <p className="mt-6 inline-block rounded-xl bg-ice px-5 py-3 text-sm">
          Numéro de commande : <strong className="font-bold tracking-wide">{session.orderNumber}</strong>
          {typeof session.amountTotal === 'number' && (
            <span className="ml-3 tabular-nums">{formatCents(session.amountTotal)}</span>
          )}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {session.orderNumber && session.customerEmail && (
          <Link href={`/track-order?number=${encodeURIComponent(session.orderNumber)}&email=${encodeURIComponent(session.customerEmail)}`} className="btn-primary btn-sm">
            Suivre ma commande
          </Link>
        )}
        <Link href="/collections" className="btn-outline btn-sm">Continuer mes achats</Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container-x grid place-items-center py-24"><Spinner label="Chargement…" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
