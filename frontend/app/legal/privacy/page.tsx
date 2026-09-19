import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité BORÉALE : données collectées, finalités, durée de conservation, cookies, vos droits RGPD.',
  path: '/legal/privacy',
});

/** Modèle RGPD à COMPLÉTER et à FAIRE VALIDER avant lancement (registre des traitements, DPO le cas échéant). */
export default function PrivacyPage() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="font-display text-4xl font-semibold">Politique de confidentialité</h1>
      <p className="mt-2 rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-500">
        ⚠️ Document de travail conforme au RGPD dans sa structure : à compléter (identité, durées exactes, registre)
        et à faire valider avant lancement.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-500">
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">1. Responsable du traitement</h2>
          <p>
            [RAISON SOCIALE], [FORME JURIDIQUE], siège social [ADRESSE], [SIREN], email : [EMAIL], téléphone :
            [TÉLÉPHONE].
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">2. Données collectées et finalités</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Compte client</strong> : email, mot de passe (chiffré, jamais stocké en clair), nom, prénom, téléphone — gestion du compte et des commandes (base légale : contrat).</li>
            <li><strong>Commande</strong> : identité, adresse de livraison, historique d’achat — exécution et suivi de la commande, obligations comptables (base légale : contrat / obligation légale).</li>
            <li><strong>Paiement</strong> : traité par Stripe ; nous ne stockons aucune donnée bancaire (numéro de carte, cryptogramme). Seuls la référence de paiement et le statut sont conservés.</li>
            <li><strong>Newsletter</strong> : email — envoi d’emails d’information et d’offres (base légale : consentement, retiré à tout moment via le lien de désinscription).</li>
            <li><strong>Panier abandonné</strong> : si vous saisissez votre email sur la page de paiement sans finaliser, un unique email de rappel peut être envoyé après 3 heures (base légale : intérêt légitime ; opposition possible en nous écrivant).</li>
            <li><strong>Formulaire de contact</strong> : nom, email, message — traitement de votre demande (base légale : intérêt légitime).</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">3. Durées de conservation</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Données de compte : durée du compte, puis archivage 3 ans après le dernier contact.</li>
            <li>Données de commande : 10 ans (obligation comptable, art. L123-22 Code de commerce).</li>
            <li>Newsletter : jusqu’à désinscription, puis suppression sous 30 jours ; preuve de consentement 3 ans.</li>
            <li>Paniers abandonnés : 30 jours après l’envoi du rappel.</li>
            <li>Messages contact : 3 ans.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">4. Destinataires et sous-traitants</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Supabase</strong> (hébergement base de données, UE) — stockage des données ci-dessus.</li>
            <li><strong>Stripe</strong> (paiement) — données de transaction.</li>
            <li><strong>Resend</strong> (emails transactionnels) — email et contenu des messages.</li>
            <li><strong>Vercel</strong> (hébergement du site et de l’API).</li>
            <li>Transporteur de la commande (nom, adresse, téléphone, email limités à la livraison).</li>
          </ul>
          <p className="mt-2">Aucune vente de données personnelles. Transferts hors UE encadrés par les clauses contractuelles types des sous-traitants cités.</p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">5. Cookies</h2>
          <p>
            Ce site utilise uniquement des cookies strictement nécessaires au fonctionnement (panier, session de
            connexion — exemptés de consentement). Des cookies de mesure d’audience et publicitaires ne seront ajoutés
            qu’avec un bandeau de consentement conforme, après décision de l’exploitant.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">6. Vos droits</h2>
          <p>
            Accès, rectification, effacement, limitation, opposition, portabilité, directives post-mortem, réclamation
            auprès de la CNIL (cnil.fr). Exercice par email à [EMAIL] — réponse sous 30 jours.
          </p>
        </section>
        <section>
          <h2 className="font-display mb-2 text-xl font-semibold text-ink">7. Sécurité</h2>
          <p>
            Mots de passe hachés (scrypt), connexions chiffrées (TLS), accès aux données restreint (Row Level Security
            en base, contrôles d’accès applicatifs), aucune donnée bancaire stockée sur nos systèmes.
          </p>
        </section>
      </div>
    </div>
  );
}
