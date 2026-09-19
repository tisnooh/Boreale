import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Suivi de commande',
    description: 'Suivez votre commande BORÉALE avec votre numéro de commande et votre email — sans créer de compte.',
    path: '/track-order',
  }),
  robots: { index: false, follow: false },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
