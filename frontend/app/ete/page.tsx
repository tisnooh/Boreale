import type { Metadata, Viewport } from 'next';
import { buildMetadata } from '@/lib/seo';
import { SummerHome } from '@/components/home/SummerHome';

export const metadata: Metadata = buildMetadata({
  title: 'Univers Été — plage, voyage, fraîcheur, outdoor, terrasse',
  description:
    'L’univers été BORÉALE : plage & piscine, voyage, fraîcheur, outdoor, auto été et maison & terrasse. Même exigence de sélection que l’hiver, panier et compte communs.',
  path: '/ete',
});

export const viewport: Viewport = {
  themeColor: '#0C3B40',
};

export default function SummerPage() {
  return <SummerHome />;
}
