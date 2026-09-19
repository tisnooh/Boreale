import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Conditions générales de vente',
  description: 'Conditions générales de vente de la boutique BORÉALE : commande, prix, livraison, retours, remboursement, garanties.',
  path: '/legal/terms',
});

/** Modèle de CGV à COMPLÉTER et à FAIRE VALIDER juridiquement avant lancement (voir TASKS.md). */
export default function TermsPage() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Conditions générales de vente</h1>
      <p className="mt-2 rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-500">
        ⚠️ Document de travail : les mentions entre crochets doivent être complétées (identité légale de la société)
        et l’ensemble validé par un juriste avant le lancement commercial.
      </p>

      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-ink-500">
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">1. Objet</h2>
          <p>
            Les présentes conditions générales de vente (CGV) régissent les ventes conclues sur le site [DOMAINE] entre
            [RAISON SOCIALE], [FORME JURIDIQUE] au capital de [MONTANT] €, immatriculée au RCS de [VILLE] sous le
            numéro [SIREN], dont le siège social est situé [ADRESSE] (ci-après « le Vendeur »), et toute personne
            effectuant un achat (ci-après « le Client »).
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">2. Produits</h2>
          <p>
            Les produits proposés à la vente sont décrits et présentés avec la plus grande exactitude possible. Les
            photographies sont fournies à titre d’information ; les différences mineures de teinte n’affectent pas la
            conformité des produits. Les offres sont valables dans la limite des stocks disponibles.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">3. Prix et paiement</h2>
          <p>
            Les prix sont indiqués en euros, toutes taxes comprises (TTC), hors frais de livraison qui sont précisés
            avant la validation de la commande. Le paiement s’effectue par carte bancaire via la plateforme sécurisée
            Stripe ; les données bancaires du Client ne transitent pas par les systèmes du Vendeur. La commande est
            validée après confirmation du paiement.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">4. Livraison</h2>
          <p>
            Les commandes sont préparées sous 24 à 48 h ouvrées et expédiées depuis la France. Délais indicatifs :
            standard 48-72 h ouvrées, express 24-48 h ouvrées (France métropolitaine). Les délais sont communiqués à
            titre indicatif ; un retard ne saurait ouvrir droit à l’annulation automatique, conformément à la
            réglementation, sauf dépassement de plus de 30 jours permettant la résolution du contrat (art. L216-2 du
            Code de la consommation).
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">5. Droit de rétractation et retours</h2>
          <p>
            Le Client dispose du délai légal de rétractation de 14 jours à compter de la réception du bien (art.
            L221-18 du Code de la consommation), porté commercialement à 30 jours par le Vendeur. Les produits doivent
            être retournés non utilisés, dans leur emballage d’origine. Les frais de retour sont à la charge du Client,
            sauf produit non conforme ou défectueux. Le remboursement intervient sous 14 jours à compter de la
            réception du retour (art. L221-24), via le moyen de paiement d’origine.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">6. Garanties légales</h2>
          <p>
            Les produits bénéficient de la garantie légale de conformité (art. L217-3 et s. du Code de la
            consommation) et de la garantie des vices cachés (art. 1641 et s. du Code civil).
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">7. Promotions et codes de réduction</h2>
          <p>
            Les codes de réduction sont personnels, non cumulables sauf mention contraire, et valables aux conditions
            (montant minimum, dates) précisées lors de leur émission. Conformément à la directive (UE) 2019/2161, tout
            prix de référence barré correspond au prix le plus bas pratiqué dans les 30 jours précédant la réduction.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">8. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est décrit dans la politique de confidentialité. Le Client peut
            exercer ses droits (accès, rectification, effacement, opposition, portabilité) en écrivant à [EMAIL].
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">9. Médiation et litiges</h2>
          <p>
            En cas de litige, le Client peut recourir gratuitement au médiateur de la consommation [NOM DU MÉDIATEUR
            À DÉSIGNER — obligatoire avant lancement]. À défaut de résolution amiable, les tribunaux français sont
            compétents. Plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">10. Contact</h2>
          <p>
            [RAISON SOCIALE] — [ADRESSE] — [EMAIL] — [TÉLÉPHONE]. Directeur de la publication : [NOM]. Hébergeur :
            Vercel Inc. — TVA intracommunautaire : [À COMPLÉTER].
          </p>
        </section>
      </div>
    </div>
  );
}
