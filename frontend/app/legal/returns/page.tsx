import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Retours & remboursements',
  description: 'Droit de rétractation, modalités de retour et conditions de remboursement des commandes BORÉALE.',
  path: '/legal/returns',
});

export default function ReturnsPage() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Retours & remboursements</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Sauf exception légale, vous disposez de <strong className="text-ink">14 jours à compter de la réception</strong>
        pour notifier votre rétractation, sans avoir à la justifier.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-500">
        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Comment retourner un article</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Déclarez votre rétractation sans ambiguïté avant la fin du délai. Indiquez le numéro de commande et les articles concernés.</li>
            <li>Renvoyez les articles à l’adresse de retour indiquée pour votre commande dans les 14 jours suivant votre déclaration, sauf si BORÉALE propose de les récupérer.</li>
            <li>Conservez la preuve d’expédition du retour.</li>
          </ol>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Frais de retour</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>En cas de rétractation, les frais directs de retour sont à votre charge si vous en avez été informé avant la commande et si BORÉALE ne propose pas de les prendre en charge.</li>
            <li>Pour un article défectueux ou non conforme, <Link href="/contact" className="font-semibold text-ember-dark underline underline-offset-2">contactez-nous</Link> pour exercer vos droits au titre des garanties légales.</li>
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Remboursement</h2>
          <p>
            En cas de rétractation sur la totalité de la commande, le remboursement comprend les frais de livraison
            standard. Il intervient au plus tard 14 jours après notification de la rétractation. Si BORÉALE ne
            propose pas de récupérer les articles, le remboursement peut être différé jusqu’à leur réception ou
            jusqu’à réception de la preuve d’expédition, selon le premier de ces événements. Le moyen de paiement
            d’origine est utilisé, sauf accord pour un autre moyen sans frais pour vous.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Exceptions</h2>
          <p>
            Les exceptions légales au droit de rétractation sont indiquées avant la commande lorsqu’elles s’appliquent.
            Une dépréciation peut être prise en compte si l’article a été manipulé au-delà de ce qui est nécessaire
            pour vérifier sa nature, ses caractéristiques et son fonctionnement, sous réserve de l’information
            prévue par la loi.
          </p>
        </section>

        <p className="text-xs text-muted">
          Projet à valider avant ouverture. L’adresse de retour, le formulaire type et la fonctionnalité de rétractation
          en ligne restent à finaliser.
        </p>
      </div>
    </div>
  );
}
