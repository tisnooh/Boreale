import Link from 'next/link';
import { BRAND, FOOTER_LINKS } from '@/lib/constants';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-ink text-ice">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light withBaseline />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ice/70">
            {BRAND.name} sélectionne des essentiels d’hiver chauds, beaux et durables : textile, chaleur sans
            électricité, auto et cocooning. Expédié depuis la France.
          </p>
          <p className="mt-4 text-xs text-ice/50">
            Service client :{' '}
            <a href={`mailto:${BRAND.supportEmail}`} className="underline underline-offset-2 hover:text-white">
              {BRAND.supportEmail}
            </a>
          </p>
        </div>
        <FooterCol title="Boutique" links={FOOTER_LINKS.boutique} />
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
