import type { Metadata } from 'next';
import { apiGetServer } from '@/lib/api-server';
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { FaqSection } from '@/components/home/FaqSection';
import { HOMEPAGE_FALLBACK } from '@/lib/homepage-fallback';
import type { HomepageSettings } from '@/lib/types';
import Link from 'next/link';

export const metadata: Metadata = buildMetadata({
  title: 'FAQ — Livraison, retours, paiement, produits',
  description:
    'Toutes les réponses : délais de livraison, retours 30 jours, paiement sécurisé Stripe, suivi de commande, produits chauffants, entretien du textile.',
  path: '/faq',
});

export default async function FaqPage() {
  const settings = await apiGetServer<{ data: HomepageSettings }>('/api/settings/homepage');
  const faq = settings?.data?.faq ?? HOMEPAGE_FALLBACK.faq;

  const extra = [
    { q: 'Expédiez-vous hors de France ?', a: 'Au lancement, nous livrons la France métropolitaine. L’extension Belgique/Suisse/Luxembourg arrive — inscrivez-vous à la newsletter pour être prévenu.' },
    { q: 'Comment entretenir mes articles textiles ?', a: 'La plupart de nos textiles se lavent en machine à 30° (sauf indication contraire sur la fiche produit). Séchage à plat recommandé pour la polaire et la sherpa, pas d’adoucissant sur les leggings thermiques.' },
    { q: 'Les bouillottes sèches sont-elles sûres ?', a: 'Oui, utilisées selon le mode d’emploi : durée de chauffe respectée, température testée avant application, jamais sur peau lésée, jamais de réchauffage prolongé. Ce sont des produits sans électricité ni liquide.' },
    { q: 'Proposez-vous des emballages cadeaux ?', a: 'Pas encore au lancement. Vous pouvez préciser une demande dans le champ « notes » de votre commande : nous ferons notre possible.' },
    { q: 'Comment fonctionne le code de bienvenue ?', a: 'Si vous avez accepté la newsletter à l’inscription, un code WELCOME10 (−10 % dès 20 €) vous est envoyé par email. Il est saisissable dans le panier ou au checkout.' },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd([...faq, ...extra])) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'FAQ', path: '/faq' }])),
        }}
      />
      <div className="container-x max-w-3xl py-12">
        <h1 className="font-display text-4xl font-semibold">Questions fréquentes</h1>
        <p className="mt-2 text-sm text-muted">
          Livraison, retours, paiement, entretien — tout ce qu’il faut savoir. Une question sans réponse ici ?{' '}
          <Link href="/contact" className="font-semibold text-ember-dark underline underline-offset-2">Écrivez-nous</Link>.
        </p>
        <div className="mt-10">
          <FaqSection faq={[...faq, ...extra]} withSchema={false} />
        </div>
      </div>
    </>
  );
}
