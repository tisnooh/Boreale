import type { HomepageSettings } from '@/lib/types';
import { BENEFIT_ICONS } from '@/components/Icons';

export function Benefits({ benefits }: { benefits: HomepageSettings['benefits'] }) {
  return (
    <section aria-label="Nos engagements" className="container-x py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => {
          const Icon = BENEFIT_ICONS[b.icon as keyof typeof BENEFIT_ICONS] ?? BENEFIT_ICONS.sparkle;
          return (
            <div key={b.title} className="card flex items-start gap-3.5 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ice text-glacier-dark">
                <Icon width={22} height={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">{b.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{b.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ReassuranceBar() {
  const items = [
    { n: '01', t: 'Sélection curatée', d: 'Chaque produit est choisi et testé avant d’entrer au catalogue — pas de fourre-tout.' },
    { n: '02', t: 'Chaleur sans risque', d: 'Produits chauffants sans électricité : bouillottes sèches, chauffe-mains réutilisables.' },
    { n: '03', t: 'Prix justes', d: 'Pas de faux prix barrés, pas de fausses urgences. Les économies affichées sont réelles.' },
    { n: '04', t: 'Service humain', d: 'Une équipe joignable par email, qui répond sous 24-48 h ouvrées.' },
  ];
  return (
    <section aria-label="Pourquoi Boréale" className="bg-cream py-16">
      <div className="container-x">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.n}>
              <span className="font-display text-3xl text-ember/40">{it.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{it.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
