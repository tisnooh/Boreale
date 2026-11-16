import type { DbOrder, OrderStatus } from '../types/index.js';

export const REFUND_UNAVAILABLE = 'Les remboursements sont désactivés tant que le parcours prestataire et sa reprise sur erreur ne sont pas validés.';
export const NOTIFICATIONS_UNAVAILABLE = 'L’envoi des notifications de commande n’est pas encore opérationnel.';

export function orderCapabilities(order: DbOrder) {
  const allowedStatuses: OrderStatus[] = [];
  if (order.status === 'pending' && !order.paid_at) allowedStatuses.push('cancelled');
  if (order.fulfillment_status === 'ready' && order.paid_at) {
    if (order.status === 'paid') allowedStatuses.push('processing', 'shipped');
    if (order.status === 'processing') allowedStatuses.push('shipped');
    if (order.status === 'shipped') allowedStatuses.push('delivered');
  }
  return {
    allowedStatuses,
    canEditTracking: order.fulfillment_status === 'ready' && !!order.paid_at && ['shipped', 'delivered'].includes(order.status),
    canAddNote: true,
    refund: { enabled: false, reason: REFUND_UNAVAILABLE },
    notifications: { enabled: false, reason: NOTIFICATIONS_UNAVAILABLE },
  };
}

export function safeTrackingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch { return null; }
}
