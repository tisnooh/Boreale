import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Retours & remboursements — 30 jours',
  description: 'Politique de retours BORÉALE : 30 jours pour changer d’avis, procédure pas à pas, délais et conditions de remboursement.',
  path: '/legal/returns',
});

export default function ReturnsPage() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Retours & remboursements</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Le droit de rétractation légal est de 14 jours. Nous l’étendons commercialement à <strong className="text-ink">30 jours</strong> après
        réception, sans justification.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-500">
        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Comment retourner un article</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Écrivez-nous via le <Link href="/contact" className="font-semibold text-ember-dark underline underline-offset-2">formulaire de contact</Link> en indiquant votre numéro de commande et l’article concerné.</li>
            <li>Nous vous répondons sous 24-48 h ouvrées avec la marche à suivre et l’adresse de retour.</li>
            <li>Renvoyez l’article <strong>non porté, non lavé, dans son emballage d’origine</strong>, avec le bon de commande ou votre numéro.</li>
            <li>À réception et contrôle (sous 5 jours ouvrés), le remboursement est déclenché sur le moyen de paiement d’origine.</li>
          </ol>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Frais de retour</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Changement d’avis</strong> : frais de retour à la charge du client (conforme à la loi).</li>
            <li><strong>Produit défectueux, endommagé ou erreur de notre part</strong> : retour entièrement à notre charge, remboursement ou échange au choix, sans délai supplémentaire de procédure.</li>
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Remboursement</h2>
          <p>
            Remboursement intégral du produit et des frais de livraison aller (au tarif standard) sous 14 jours maximum
            après réception du retour — en pratique sous 5 jours ouvrés. Le remboursement apparaît sur votre compte
            selon les délais de votre banque (5 à 10 jours ouvrés).
          </p>
        </section>

        <section className="card p-6">
          <h2 className="font-display mb-3 text-xl font-semibold text-ink">Exceptions</h2>
          <p>
            Pour des raisons d’hygiène, les articles portés en contact direct avec la peau (chaussettes, chaussons,
            cache-cous, bonnets) ne sont ni repris ni échangés <strong>s’ils ont été portés ou lavés</strong>. Un essayage
            bref ne pose aucun problème : l’article doit simplement pouvoir être revendu comme neuf.
          </p>
        </section>

        <p className="text-xs text-muted">
          ⚠️ À compléter avant lancement : adresse de retour réelle, politique échange (taille/couleur) si mise en
          place, et validation juridique (voir CGV).
        </p>
      </div>
    </div>
  );
}
