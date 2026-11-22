import { db } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';
import { ordersRepo } from '../repositories/orders.js';

export interface VerificationSession {
  id: string;
  status: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | { id: string } | null;
  metadata: Record<string, string> | null;
}
interface VerificationOrder {
  id: string; number: string; email: string; status: string; paid_at: string | null;
  total_cents: number; currency: string; fulfillment_status?: string;
}
interface VerificationSettlement {
  order_id: string; session_id: string; payment_intent_id: string; amount_cents: number; currency: string;
}
export interface CheckoutVerificationDeps {
  order(sessionId: string): Promise<VerificationOrder | null>;
  settlement(orderId: string): Promise<VerificationSettlement | null>;
}
const defaultDeps: CheckoutVerificationDeps = {
  order: id => ordersRepo.getBySessionId(id),
  async settlement(orderId) {
    const { data, error } = await db().from('order_payment_settlements')
      .select('order_id,session_id,payment_intent_id,amount_cents,currency').eq('order_id', orderId).maybeSingle();
    if (error) throw AppError.serviceUnavailable('order_verification_unavailable', 'La confirmation de commande est momentanément indisponible.');
    return data as VerificationSettlement | null;
  },
};

/** Reading Stripe never settles an order. Only the durable signed-webhook settlement proves recording. */
export async function verifyCheckoutSession(session: VerificationSession, deps: CheckoutVerificationDeps = defaultDeps) {
  if (session.metadata?.brand !== 'boreale') throw AppError.notFound('checkout_session_not_found');
  const order = await deps.order(session.id);
  if (order && (session.metadata.orderId !== order.id || session.metadata.orderNumber !== order.number
    || session.amount_total !== order.total_cents || session.currency?.toUpperCase() !== order.currency)) {
    throw AppError.conflict('checkout_session_mismatch', 'La session doit être vérifiée avant de confirmer cette commande.');
  }
  const settlement = order ? await deps.settlement(order.id) : null;
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const paidOrderRecorded = Boolean(order && order.paid_at && session.payment_status === 'paid'
    && ['paid', 'processing', 'shipped', 'delivered', 'partially_refunded', 'refunded'].includes(order.status)
    && settlement?.order_id === order.id && settlement.session_id === session.id
    && settlement.payment_intent_id === intent && settlement.amount_cents === order.total_cents
    && settlement.currency === order.currency);
  return {
    paymentStatus: session.payment_status, status: session.status, amountTotal: session.amount_total, currency: session.currency,
    customerEmail: order?.email ?? null, orderNumber: order?.number ?? null, orderId: order?.id ?? null,
    orderStatus: order?.status ?? null, fulfillmentStatus: order?.fulfillment_status ?? null, paidOrderRecorded,
  };
}
