import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/constants';
import { DEFAULT_SEASON } from '@/lib/season/config';
import { WinterHome } from '@/components/home/WinterHome';

export const metadata: Metadata = buildMetadata({
  title: `${BRAND.name} — ${BRAND.slogan}`,
  description:
    'Essentiels d’hiver sélectionnés et testés : textile chaud, chaleur sans électricité, auto hiver et cocooning. Packs cadeaux, livraison France offerte dès 69 €.',
  path: '/',
});

/**
 * "/" = boutique historique (hiver) tant que DEFAULT_SEASON = 'winter'.
 * Le jour où la maison bascule sur l'été : NEXT_PUBLIC_DEFAULT_SEASON=summer
 * et "/" redirige vers /ete — sans rien toucher d'autre (DECISIONS.md D038).
 */
export default function HomePage() {
  if (DEFAULT_SEASON === 'summer') redirect('/ete');
  return <WinterHome />;
}
