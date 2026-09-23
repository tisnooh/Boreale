import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { BRAND, SITE_URL } from '@/lib/constants';
import { apiGetServer } from '@/lib/api-server';
import { isPreview } from '@/lib/config';
import { headers } from 'next/headers';
import { getSeasonFromPath } from '@/lib/season/config';
import { CartProvider } from '@/hooks/use-cart';
import { AuthProvider } from '@/hooks/use-auth';
import { ToastProvider } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Footer } from '@/components/layout/Footer';
import { PreviewBanner } from '@/components/layout/PreviewBanner';
import { OfflineNotice } from '@/components/layout/OfflineNotice';
import { ScrollProgress } from '@/components/layout/ScrollProgress';
import type { HomepageSettings } from '@/lib/types';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.slogan}`,
    template: `%s — ${BRAND.name}`,
  },
  description:
    'Essentiels d’hiver sélectionnés et testés : chaussettes polaires, gants tactiles, bouillottes, housses pare-brise, plaids et packs cadeaux. Expédié depuis la France, retours 30 jours.',
  keywords: ['hiver', 'chaussettes polaires', 'bouillotte', 'plaid', 'gants tactiles', 'pare-brise antigivre', 'cocooning'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.slogan}`,
    description: 'Des essentiels chauds, beaux et durables pour affronter l’hiver. Expédié depuis la France.',
    images: [{ url: '/og/og-default.jpg', width: 1200, height: 630, alt: BRAND.name }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0B1B2B',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Saison courante (SSR via middleware x-pathname) → scope de tokens thème
  const pathname = (await headers()).get('x-pathname') ?? '/';
  const season = getSeasonFromPath(pathname);
  // Barre d'annonce : contenu admin de la saison en mode live ; masquée en preview
  const settings = isPreview()
    ? null
    : await apiGetServer<{ data: HomepageSettings }>(`/api/settings/homepage${season === 'summer' ? '-summer' : ''}`);
  const announcement = settings?.data?.announcementBar ?? null;

  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable} h-full`}>
      <body data-season={season} className="flex min-h-full flex-col">
        <noscript>
          <style>{'.reveal{opacity:1;transform:none}.line-mask>span{animation:none}'}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[110] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Aller au contenu
        </a>
        <ScrollProgress />
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <PreviewBanner />
              <Header announcement={announcement} />
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer season={season} />
              <CartDrawer />
              <OfflineNotice />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
