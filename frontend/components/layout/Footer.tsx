'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND, FOOTER_LINKS } from '@/lib/constants';
import { getSeasonFooterLinks } from '@/lib/season/nav';
import { getSeasonFromPath } from '@/lib/season/config';
import { Logo } from './Logo';

const SEASON_BASELINE = {
  winter: 'L’hiver, du bon côté.',
  summer: 'L’été, à ciel ouvert.',
} as const;

const SEASON_DESC = {
  winter:
    'BORÉALE sélectionne des essentiels d’hiver chauds, beaux et durables : textile, chaleur sans électricité, auto et cocooning. Expédié depuis la France.',
  summer:
    'BORÉALE sélectionne des essentiels d’été lumineux, malins et durables : plage, voyage, fraîcheur, outdoor, auto et terrasse. Expédié depuis la France.',
} as const;

/** Footer commun aux deux saisons : liens, baseline et description suivent l'URL courante. */
export function Footer() {
  const pathname = usePathname();
  const season = getSeasonFromPath(pathname);

  return (
    <footer className="mt-20 border-t border-line bg-ink text-ice">
      <div className="container-x pt-14" aria-hidden>
        <p className="footer-wordmark select-none text-center">BORÉALE</p>
        <p className="mt-4 text-center text-[10px] tracking-[0.35em] text-ice/50 uppercase">
          {SEASON_BASELINE[season]}
        </p>
      </div>
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light baseline={SEASON_BASELINE[season]} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ice/70">{SEASON_DESC[season]}</p>
          <p className="mt-4 text-xs text-ice/50">
            Service client :{' '}
            <a href={`mailto:${BRAND.supportEmail}`} className="underline underline-offset-2 hover:text-white">
              {BRAND.supportEmail}
            </a>
          </p>
        </div>
        <FooterCol title="Boutique" links={getSeasonFooterLinks(season)} />
        <FooterCol title="Aide" links={FOOTER_LINKS.aide} />
        <FooterCol title="La maison" links={FOOTER_LINKS.maison} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-ice/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name} — {BRAND.legalName}. Tous droits réservés.
          </p>
          <p>Paiement sécurisé par Stripe · Prix TTC en euros</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-3 text-xs font-bold tracking-[0.18em] text-white/80 uppercase">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-ice/70 transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
