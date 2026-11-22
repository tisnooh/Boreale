import { SnowflakeIcon } from '@/components/Icons';

/**
 * Folio de journal (remplace le ticker défilant, jugé générique) :
 * une ligne hairline, trois mentions en petites capitales, flocon central.
 * Statique, sobre, aucune animation — le repos visuel après la cover.
 */
export function Folio({ season = 'winter' }: { season?: 'winter' | 'summer' }) {
  return (
    <div className="border-b border-line bg-snow">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 py-3 text-[10px] font-semibold tracking-[0.24em] text-muted uppercase">
        <span>Maison BORÉALE — édition {season === 'summer' ? 'été' : 'hiver'}</span>
        <span className="hidden items-center gap-2.5 md:flex">
          <SnowflakeIcon width={11} height={11} className="text-ember-dark" aria-hidden />
          {season === 'winter' ? '5 essentiels · sélection en préparation' : 'Une collection · des essentiels'}
          <SnowflakeIcon width={11} height={11} className="text-ember-dark" aria-hidden />
        </span>
        <span>Conditions précisées avant ouverture</span>
      </div>
    </div>
  );
}
