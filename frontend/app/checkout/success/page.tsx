'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Spinner } from '@/components/ui';
import { CheckIcon } from '@/components/Icons';
import { completeCheckoutAttempt } from '@/lib/checkout-attempt';

interface SessionInfo {
  paymentStatus: string;
  amountTotal: number | null;
  customerEmail: string | null;
  orderNumber: string | null;
  paidOrderRecorded?: boolean;
  fulfillmentStatus?: string | null;
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
      .then((res) => {
        completeCheckoutAttempt(res.data);
        setSession(res.data);
      })
      .catch(() => setFailed(true));
  }, [sessionId]);

  if (failed || (!session && sessionId === null)) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Page de confirmation</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Impossible de vérifier le paiement et l’enregistrement de la commande. Si vous avez été débité,
          ne relancez pas un paiement : contactez le support pour vérification.
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
  const recorded = paid && session.paidOrderRecorded === true;

  return (
    <div className="container-x py-16 text-center">
      <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${recorded ? 'bg-success/15 text-success' : 'bg-cream text-ink-500'}`}>
        <CheckIcon width={30} height={30} />
      </span>
      <h1 className="font-display mt-6 text-3xl font-semibold sm:text-4xl">
        {recorded ? 'Merci, votre commande est enregistrée !' : paid ? 'Paiement reçu, confirmation de commande en cours' : 'Paiement en cours de traitement'}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
        {recorded ? (
          <>
            {session.fulfillmentStatus === 'blocked'
              ? 'Votre commande nécessite une vérification avant préparation. Aucun délai d’expédition n’est confirmé.'
              : 'Votre commande a bien été reçue. Consultez son suivi pour connaître son état de préparation.'}
          </>
        ) : (
          <>La confirmation de la commande est en cours de vérification. Ne relancez pas un autre paiement ; contactez le support si la situation persiste.</>
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
