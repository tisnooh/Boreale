import type { HomepageSettings } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Manifeste en page de journal : statement à gauche, texte long à lettrine à droite,
 * principes en registre ligné (numéros braise) — plus aucune carte-colonne « trust badges ».
 * Contenu toujours piloté par l'admin (settings.benefits), aucun claim inventé.
 */
const COPY = {
  winter: {
    statement: ['Nous ne vendons', 'pas de l’hiver.', 'Nous vendons des raisons de l’aimer.'],
    journal:
      'BORÉALE est née d’une conviction simple : avec les bons essentiels, l’hiver devient la saison la plus confortable de l’année. Alors nous cherchons, nous testons, nous écartons. Quatorze pièces seulement, choisies pour ce qu’elles résolvent — un carrelage glacé, un pare-brise givré, un cou exposé au vent — et pour ce qu’elles durent. Rien de plus ne rentrerait sans affaiblir le reste.',
  },
  summer: {
    statement: ['Nous ne vendons', 'pas de l’été.', 'Nous vendons des raisons de l’aimer.'],
    journal:
      'L’été suit la même règle que l’hiver : avec les bons essentiels, la saison chaude devient la plus belle de l’année. Nous cherchons, nous testons, nous écartons — pour la plage, les trajets, les terrasses. Les pièces été arriveront quand, et seulement quand, elles auront mérité leur place au catalogue.',
  },
} as const;

export function Manifesto({ benefits, season = 'winter' }: { benefits: HomepageSettings['benefits']; season?: 'winter' | 'summer' }) {
  const copy = COPY[season];
  return (
    <section aria-label="Manifeste" className="bg-ink py-24 text-white lg:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        {/* Statement */}
        <div className="lg:col-span-5">
          <Reveal>
            <Overline index="N°03" label="Manifeste" dark />
            <p className="display-section mt-8">
              {copy.statement[0]}
              <br />
              {copy.statement[1]}
              <br />
              <em className="text-ember">{copy.statement[2]}</em>
            </p>
            <div className="mt-10 flex items-center gap-4">
              <span className="h-px w-16 bg-ember" aria-hidden />
              <span className="text-[10px] font-semibold tracking-[0.3em] text-ice/60 uppercase">
                La maison BORÉALE
              </span>
            </div>
          </Reveal>
        </div>

        {/* Page de journal */}
        <div className="lg:col-span-7">
          <Reveal delay={120}>
            <p className="dropcap max-w-prose text-[15px] leading-[1.9] text-ice/75">
              {copy.journal}
            </p>
          </Reveal>

          <ul className="mt-12 border-t border-white/10">
            {benefits.map((b, i) => (
              <Reveal as="li" key={b.title} delay={i * 90}>
                <div className="group grid grid-cols-[2.75rem_1fr] items-baseline gap-4 border-b border-white/10 py-5 transition-colors hover:bg-white/[0.03] sm:grid-cols-[3.5rem_16rem_1fr] sm:gap-6 sm:px-2">
                  <span className="font-display text-lg text-ember tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-display text-lg font-semibold transition-transform duration-300 group-hover:translate-x-1">
                    {b.title}
                  </h3>
                  <p className="col-span-2 text-sm leading-relaxed text-ice/60 sm:col-span-1">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={200}>
            <p className="mt-8 max-w-prose text-xs leading-relaxed text-ice/45">
              Pas de faux avis, pas de compteur urgence, pas de prix barré fictif : ce que vous voyez
              sur ce site est ce que nous pouvons tenir le jour de l’ouverture.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
