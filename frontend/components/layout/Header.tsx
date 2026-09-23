'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRAND, NAV_COLLECTIONS } from '@/lib/constants';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from './Logo';
import { CartIcon, MenuIcon, UserIcon, XIcon } from '@/components/Icons';
import { SeasonSwitch } from './SeasonSwitch';

export function Header({ announcement }: { announcement: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openDrawer, ready } = useCart();
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Fermeture du menu mobile au clavier (ESC)
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (isAdmin) return null; // l'admin a son propre shell

  return (
    <header className="sticky top-0 z-50">
      {announcement && (
        <div className="bg-ink px-4 py-2 text-center text-[12px] font-medium tracking-wide text-ice">
          {announcement}
        </div>
      )}
      <div className="border-b border-line bg-white/90 backdrop-blur-md">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-ice lg:hidden"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>

          <Link href="/" aria-label={`${BRAND.name} — accueil`} className="shrink-0">
            <Logo />
          </Link>

          <SeasonSwitch className="hidden md:inline-flex" />
          <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
            <Link href="/collections" className="text-sm font-semibold text-ink transition hover:text-ember-dark">
              Boutique
            </Link>
            {NAV_COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="text-sm text-ink-500 transition hover:text-ember-dark"
              >
                {c.name}
              </Link>
            ))}
            <Link href="/collections#packs" className="text-sm text-ink-500 transition hover:text-ember-dark">
              Packs
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/track-order"
              className="hidden rounded-xl px-3 py-2 text-sm text-ink-500 transition hover:bg-ice hover:text-ink md:block"
            >
              Suivi
            </Link>
            <Link
              href="/account"
              aria-label={user ? 'Mon compte' : 'Se connecter'}
              className="grid h-10 w-10 place-items-center rounded-xl text-ink transition hover:bg-ice"
            >
              <UserIcon />
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Panier (${ready ? count : 0} articles)`}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-ink transition hover:bg-ice"
            >
              <CartIcon />
              {ready && count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="border-b border-line bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            <div className="px-3 pb-2">
              <SeasonSwitch />
            </div>
            <MobileLink href="/collections">Toute la boutique</MobileLink>
            {NAV_COLLECTIONS.map((c) => (
              <MobileLink key={c.slug} href={`/collections/${c.slug}`}>
                {c.name}
              </MobileLink>
            ))}
            <MobileLink href="/collections#packs">Packs & bundles</MobileLink>
            <div className="my-2 border-t border-line" />
            <MobileLink href="/track-order">Suivre ma commande</MobileLink>
            <MobileLink href="/account">{user ? 'Mon compte' : 'Connexion'}</MobileLink>
            <MobileLink href="/faq">FAQ</MobileLink>
            <MobileLink href="/contact">Contact</MobileLink>
          </div>
        </nav>
      )}
    </header>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-ice">
      {children}
    </Link>
  );
}
