import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paiement annulé',
  robots: { index: false, follow: false },
};

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <div className="container-x py-20 text-center">
      <h1 className="font-display text-3xl font-semibold">Paiement interrompu</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
        Aucun débit n’a été effectué{order ? ` pour la commande ${order}` : ''}. Votre panier est conservé : vous
        pouvez reprendre le paiement à tout moment, ou nous écrire si une difficulté vous a bloqué.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/checkout" className="btn-primary btn-sm">Reprendre le paiement</Link>
        <Link href="/cart" className="btn-outline btn-sm">Voir mon panier</Link>
        <Link href="/contact" className="btn-ghost btn-sm">Contacter le support</Link>
      </div>
    </div>
  );
}
