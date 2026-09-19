import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge ${ORDER_STATUS_COLORS[status] ?? 'bg-ice text-ink-500'}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-muted">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function QtyStepper({
  value,
  min = 1,
  max = 20,
  onChange,
  small = false,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  small?: boolean;
}) {
  const btn = small ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className={`inline-flex items-center rounded-xl border border-line ${small ? 'gap-0.5 p-0.5' : 'gap-1 p-1'}`}>
      <button
        type="button"
        aria-label="Diminuer la quantité"
        className={`${btn} grid place-items-center rounded-lg text-ink transition hover:bg-ice disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <span className={`text-center font-semibold tabular-nums ${small ? 'w-6 text-xs' : 'w-8 text-sm'}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        className={`${btn} grid place-items-center rounded-lg text-ink transition hover:bg-ice disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
