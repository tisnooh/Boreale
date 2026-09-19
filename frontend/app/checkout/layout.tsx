import type { Metadata } from 'next';

// Le checkout n'est pas indexable (contenu transactionnel)
export const metadata: Metadata = {
  title: 'Paiement sécurisé',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
