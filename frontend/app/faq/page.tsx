import type { Metadata } from 'next';
import { getCatalogSource } from '@/lib/catalog/source';
import { SUMMER_HOMEPAGE } from '@/lib/season/content-summer';
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { FaqSection } from '@/components/home/FaqSection';
import { HOMEPAGE_FALLBACK } from '@/lib/homepage-fallback';
import type { HomepageSettings } from '@/lib/types';
import Link from 'next/link';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ saison?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.saison === 'ete') {
    return buildMetadata({
      title: 'FAQ été — ouverture, sélection, panier commun, retours',
      description:
        'Les réponses de l’univers été BORÉALE sur la sélection, le panier commun et les conditions de retour.',
      path: '/faq?saison=ete',
    });
  }
  return buildMetadata({
    title: 'FAQ — Livraison, retours, paiement, produits',
    description:
      'Les réponses de BORÉALE sur la livraison, les retours, le suivi de commande et l’entretien des articles.',
    path: '/faq',
  });
}

export default async function FaqPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const sp = await searchParams;
  const summer = sp.saison === 'ete';
  const source = getCatalogSource();
  const settings = summer ? SUMMER_HOMEPAGE : await source.homepage('winter');
  const faq = settings.faq;

  const extra = [
    { q: 'Où voir les conditions de livraison ?', a: 'Les zones desservies, les frais et le délai de livraison seront indiqués avant la validation d’une commande.' },
    { q: 'Comment entretenir mes articles textiles ?', a: 'Suivez les consignes de la fiche produit et de l’étiquette de l’article.' },
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
        <h1 className="font-display text-4xl font-semibold">{summer ? 'Questions fréquentes — été' : 'Questions fréquentes'}</h1>
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
