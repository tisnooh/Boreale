import { formatDate } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';
import { CheckIcon } from './Icons';

const STEPS = [
  { key: 'paid', label: 'Payée', date: (o: OrderDTO) => o.paidAt },
  { key: 'processing', label: 'En préparation', date: () => null },
  { key: 'shipped', label: 'Expédiée', date: (o: OrderDTO) => o.shippedAt },
  { key: 'delivered', label: 'Livrée', date: (o: OrderDTO) => o.deliveredAt },
] as const;

const ORDER_FLOW = ['paid', 'processing', 'shipped', 'delivered'];

/** Timeline de statut — honnête : seules les dates réellement enregistrées sont affichées. */
export function OrderTimeline({ order }: { order: OrderDTO }) {
  if (order.status === 'cancelled') {
    return (
      <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
        Commande annulée{order.cancelledAt ? ` le ${formatDate(order.cancelledAt)}` : ''}. Aucun débit n’est conservé :
        si un paiement avait eu lieu, il a été remboursé.
      </p>
    );
  }
  const currentIdx = ORDER_FLOW.indexOf(order.status === 'pending' ? '' : order.status);
  const refunded = order.status === 'refunded' || order.status === 'partially_refunded';

  return (
    <div>
      <ol className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = order.status !== 'pending' && i <= currentIdx;
          const date = step.date(order);
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center text-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition ${
                  done ? 'border-success bg-success text-white' : 'border-line bg-white text-muted'
                }`}
                aria-hidden
              >
                {done ? <CheckIcon width={14} height={14} /> : i + 1}
              </span>
              <span className={`mt-1.5 text-[11px] font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{step.label}</span>
              {date && <span className="text-[10px] text-muted">{formatDate(date)}</span>}
              {i < STEPS.length - 1 && <span className="sr-only">→</span>}
            </li>
          );
        })}
      </ol>
      {order.status === 'pending' && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-2.5 text-center text-xs text-ink-500">
          En attente de paiement — finalisez le paiement pour valider la commande.
        </p>
      )}
      {refunded && (
        <p className="mt-3 rounded-xl bg-danger/10 px-4 py-2.5 text-center text-xs font-medium text-danger">
          {order.status === 'refunded' ? 'Commande remboursée intégralement.' : 'Commande partiellement remboursée.'}
        </p>
      )}
      {order.tracking.number && (
        <p className="mt-3 rounded-xl bg-glacier/10 px-4 py-2.5 text-center text-xs text-glacier-dark">
          Suivi {order.tracking.carrier ?? ''} : <strong>{order.tracking.number}</strong>
          {order.tracking.url && (
            <>
              {' '}·{' '}
              <a href={order.tracking.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">
                Suivre le colis
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
