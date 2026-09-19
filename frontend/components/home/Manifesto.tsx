import type { HomepageSettings } from '@/lib/types';
import { Overline } from '@/components/ui/Overline';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Manifeste de marque — remplace la grille de cartes « bénéfices » template :
 * grande déclaration serif + principes numérotés en colonnes hairline.
 * Contenu piloté par l'admin (settings.benefits), aucun claim inventé.
 */
export function Manifesto({ benefits }: { benefits: HomepageSettings['benefits'] }) {
  return (
    <section aria-label="Manifeste" className="bg-ink py-20 text-white lg:py-28">
      <div className="container-x">
        <Overline index="N°04" label="Manifeste" dark />
        <Reveal as="p" className="display-section mt-8 max-w-3xl">
          Nous ne vendons pas de l’hiver.
          <br />
          <em className="text-ember">Nous vendons des raisons de l’aimer.</em>
        </Reveal>
        <ul className="mt-16 grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <Reveal as="li" key={b.title} delay={i * 100}>
              <span className="font-display text-sm text-ember tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="font-display mt-3 text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ice/65">{b.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
