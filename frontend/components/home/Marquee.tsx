import { SnowflakeIcon } from '@/components/Icons';

const ITEMS = [
  'Maison BORÉALE',
  'Collection hiver',
  'Confort à la maison et dehors',
];

/** Ticker de marque — boucle infinie sobre, désactivée si prefers-reduced-motion. */
export function Marquee() {
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center" aria-hidden={key === 'b'}>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-6 px-6 text-[11px] font-semibold tracking-[0.22em] uppercase whitespace-nowrap text-ice/80">
          {item}
          <SnowflakeIcon width={12} height={12} className="text-ember" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-y border-white/10 bg-ink py-3.5" role="presentation">
      <div className="marquee-track flex w-max">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
