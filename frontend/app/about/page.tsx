import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Notre histoire — Pourquoi BORÉALE',
  description:
    'BORÉALE est née d’une conviction simple : l’hiver devrait être la saison la plus confortable de l’année. Découvrez notre mission, nos critères de sélection et nos engagements.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Notre histoire', path: '/about' }])),
        }}
      />
      <div className="bg-ink py-20 text-center text-white">
        <div className="container-x">
          <h1 className="font-display mx-auto max-w-2xl text-4xl font-semibold sm:text-5xl">
            L’hiver n’est pas un problème. C’est une saison.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-ice/75">
            {BRAND.name} est née d’une conviction simple : avec les bons essentiels, l’hiver devient la saison la plus
            confortable de l’année.
          </p>
        </div>
      </div>

      <div className="container-x max-w-3xl py-14">
        <div className="space-y-6 text-[15px] leading-relaxed text-ink-500">
          <h2 className="font-display text-2xl font-semibold text-ink">Notre mission</h2>
          <p>
            Chaque hiver, c’est la même histoire : les pieds glacés sur le carrelage, le pare-brise gelé un matin de
            départ au travail, le courant d’air dans le cou sur le quai de la gare, le plaid trop petit qu’on se
            dispute sur le canapé. Ces petits froids du quotidien gâchent la saison la plus cosy de l’année.
          </p>
          <p>
            {BRAND.name} existe pour les régler un par un. Nous cherchons, testons et sélectionnons les essentiels qui
            tiennent réellement chaud — sans catalogue fourre-tout, sans gadgets, sans promesses exagérées.
          </p>

          <h2 className="font-display pt-4 text-2xl font-semibold text-ink">Nos critères de sélection</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Utilité réelle</strong> : le produit résout un problème de froid précis, mesurable.</li>
            <li><strong>Matières et fabrication</strong> : compositions affichées, qualité vérifiée sur échantillon avant référencement.</li>
            <li><strong>Sécurité</strong> : aucun produit chauffant électrique tant que la conformité CE du fournisseur n’est pas documentée. Nos solutions de chaleur sont simples et éprouvées (noyaux de cerise, cristallisation, polaire).</li>
            <li><strong>Durabilité</strong> : lavable, réutilisable, réparable quand c’est possible — l’anti jetable.</li>
          </ul>

          <h2 className="font-display pt-4 text-2xl font-semibold text-ink">Nos engagements d’honnêteté</h2>
          <p>
            Pas de faux avis, pas de faux compteurs d’urgence, pas de prix barrés fictifs : les économies affichées sur
            nos packs correspondent à la somme réelle des articles au prix actuel. Les photos des produits sont celles
            des produits que nous vendons. Si nous nous trompons sur un produit, nous le retirons du catalogue.
          </p>

          <h2 className="font-display pt-4 text-2xl font-semibold text-ink">Où nous trouver</h2>
          <p>
            {BRAND.name} est une jeune marque française en lancement — ce site est notre première boutique. Une
            question, un conseil, un retour d’expérience sur un produit : écrivez-nous, nous lisons tout.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link href="/collections" className="btn-primary">Découvrir la collection</Link>
            <Link href="/contact" className="btn-outline">Nous écrire</Link>
          </div>
        </div>
      </div>
    </>
  );
}
