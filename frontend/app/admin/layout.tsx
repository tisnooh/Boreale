import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin — BORÉALE', template: '%s — Admin BORÉALE' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
