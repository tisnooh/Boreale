import { SnowflakeIcon } from '@/components/Icons';

/**
 * Folio de journal (remplace le ticker défilant, jugé générique) :
 * une ligne hairline, trois mentions en petites capitales, flocon central.
 * Statique, sobre, aucune animation — le repos visuel après la cover.
 */
export function Folio() {
  return (
    <div className="border-b border-line bg-snow">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-8 gap-y-1.5 py-3 text-[10px] font-semibold tracking-[0.24em] text-muted uppercase">
        <span>Maison BORÉALE — édition hiver</span>
        <span className="hidden items-center gap-2.5 md:flex">
          <SnowflakeIcon width={11} height={11} className="text-ember-dark" aria-hidden />
          14 pièces · 4 univers · 0 superflu
          <SnowflakeIcon width={11} height={11} className="text-ember-dark" aria-hidden />
        </span>
        <span>Expédition France — retours 30 j</span>
      </div>
    </div>
  );
}
