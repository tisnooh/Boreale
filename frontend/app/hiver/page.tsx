import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { WinterHome } from '@/components/home/WinterHome';

// Alias /hiver : même expérience que "/", canonical vers "/" pour éviter toute duplication SEO.
export const metadata: Metadata = buildMetadata({
  title: 'Univers Hiver — confort, chaleur, auto, cocooning',
  description:
    'L’univers hiver BORÉALE : chaussettes polaires, gants tactiles, bouillottes, housses pare-brise, plaids et packs grand froid.',
  path: '/',
});

export default function WinterPage() {
  return <WinterHome />;
}
