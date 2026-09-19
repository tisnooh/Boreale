'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { LogoMark } from '@/components/layout/Logo';

interface AdminMe {
  id: string;
  email: string;
  role: 'admin' | 'staff';
}

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/commandes', label: 'Commandes' },
  { href: '/admin/produits', label: 'Produits' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/newsletter', label: 'Newsletter' },
  { href: '/admin/contenu', label: 'Contenu accueil' },
  { href: '/admin/messages', label: 'Messages' },
];

/** Shell admin : garde d'authentification + navigation latérale. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api
      .get<{ data: AdminMe }>('/api/admin/auth/me')
      .then((res) => setMe(res.data))
      .catch(() => router.replace('/admin/login'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-snow">
        <Spinner label="Vérification de la session admin…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-snow">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-ink text-ice md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark className="h-7 w-7" />
          <span className="font-display tracking-[0.18em] text-white">BORÉALE</span>
          <span className="ml-auto rounded-full bg-ember/20 px-2 py-0.5 text-[10px] font-bold text-ember">ADMIN</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Navigation admin">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white/10 text-white' : 'text-ice/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-ice/50">{me?.email}</p>
          <div className="mt-2 flex gap-2">
            <Link href="/" target="_blank" className="text-xs text-glacier hover:underline">
              Voir le site ↗
            </Link>
            <button
              type="button"
              className="text-xs text-ice/60 hover:text-white"
              onClick={async () => {
                await api.post('/api/admin/auth/logout').catch(() => undefined);
                router.replace('/admin/login');
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-line bg-white py-1.5 md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`px-2 py-1 text-[11px] font-semibold ${active ? 'text-ember-dark' : 'text-muted'}`}>
              {item.label}
            </Link>
          );
        })}
      </div>

      <main className="min-w-0 flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
