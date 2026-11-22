import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/constants';
import { DEFAULT_SEASON } from '@/lib/season/config';
import { WinterHome } from '@/components/home/WinterHome';
import { isLaunch } from '@/lib/config';

export const metadata: Metadata = buildMetadata({
  title: isLaunch() ? 'BORÉALE — Ouverture prochaine' : `${BRAND.name} — ${BRAND.slogan}`,
  description:
    isLaunch() ? 'BORÉALE se prépare. Une maison, deux saisons : découvrez bientôt notre sélection d’essentiels pour l’hiver et l’été.' : 'Découvrez la sélection hivernale BORÉALE, pensée pour le confort par temps froid, à la maison et dehors.',
  path: '/',
});

/**
 * "/" = boutique historique (hiver) tant que DEFAULT_SEASON = 'winter'.
 * Le jour où la maison bascule sur l'été : NEXT_PUBLIC_DEFAULT_SEASON=summer
 * et "/" redirige vers /ete — sans rien toucher d'autre (DECISIONS.md D038).
 */
export default function HomePage() {
  if (isLaunch()) return null; // La page d’attente est rendue par le layout, sans providers boutique.
  if (DEFAULT_SEASON === 'summer') redirect('/ete');
  return <WinterHome />;
}
