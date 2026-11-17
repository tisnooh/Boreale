import { db } from '../lib/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AddressSnapshot, DbOrder, DbOrderItem, OrderStatus, ShippingMethod } from '../types/index.js';

export interface NewOrderInput {
  customerId: string;
  userId: string | null;
  email: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingMethod: ShippingMethod;
  discountCode: string | null;
  shippingAddress: AddressSnapshot;
  items: Omit<DbOrderItem, 'id' | 'order_id'>[];
  stripeSessionId?: string | null;
}

export interface SettlePaymentInput {
  eventId: string;
  sessionId: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
}

export interface PaymentSettlement {
  order_id: string;
  duplicate: boolean;
  fulfillment_status: 'ready' | 'blocked';
  incident_code: string | null;
}

export interface RecordRefundInput {
  eventId: string;
  chargeId: string;
  paymentIntentId: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
}

export interface RecordedRefund {
  order_id: string;
  payment_id: string;
  observed_refunded_cents: number;
  reconciliation_required: true;
  duplicate: boolean;
  changed: boolean;
}

export const ordersRepo = {
  async create(input: NewOrderInput): Promise<DbOrder> {
    // One database transaction owns the order, its item snapshots and its event.
    // An unavailable RPC must fail closed, never fall back to separate inserts.
    const { data: order, error } = await db().rpc('create_order_atomic', { p_input: input }).single();
    if (error) throw AppError.serviceUnavailable('order_creation_failed', 'La création de la commande a échoué ; une nouvelle tentative est nécessaire.');
    if (!order) throw AppError.serviceUnavailable('order_creation_unconfirmed', 'La création de la commande n’a pas été confirmée.');
    return order as DbOrder;
  },

  async settlePayment(input: SettlePaymentInput): Promise<PaymentSettlement> {
    const { data, error } = await db().rpc('settle_order_payment', {
      p_event_id: input.eventId,
      p_session_id: input.sessionId,
      p_payment_intent_id: input.paymentIntentId,
      p_amount_cents: input.amountCents,
      p_currency: input.currency,
    });
    if (error) throw AppError.serviceUnavailable('payment_settlement_failed', 'Le traitement du paiement a échoué ; une nouvelle tentative est nécessaire.');
    const result = data as PaymentSettlement | null;
    if (!result || typeof result.order_id !== 'string' || typeof result.duplicate !== 'boolean'
      || !['ready', 'blocked'].includes(result.fulfillment_status)
      || (result.incident_code !== null && typeof result.incident_code !== 'string')) {
      throw AppError.serviceUnavailable('payment_settlement_unconfirmed', 'Le traitement du paiement n’a pas été confirmé ; une nouvelle tentative est nécessaire.');
    }
    return result;
  },

  async cancelPending(id: string, reason: string): Promise<boolean> {
    const { data, error } = await db().rpc('cancel_pending_order', { p_order_id: id, p_reason: reason });
    if (error || typeof data !== 'boolean') {
      throw AppError.serviceUnavailable('order_cancellation_unconfirmed', 'L’annulation de la commande n’a pas été confirmée ; une nouvelle tentative est nécessaire.');
    }
    return data;
  },

  async addEvent(orderId: string, type: string, data: Record<string, unknown> = {}): Promise<void> {
    const { error } = await db().from('order_events').insert({ order_id: orderId, type, data });
    if (error) throw error;
  },

  async listEvents(orderId: string): Promise<{ id: number; type: string; data: unknown; created_at: string }[]> {
    const { data, error } = await db().from('order_events').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as never;
  },

  async getById(id: string): Promise<(DbOrder & { order_items: DbOrderItem[] }) | null> {
    const { data, error } = await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as never) ?? null;
  },

  async getByNumberAndEmail(number: string, email: string): Promise<(DbOrder & { order_items: DbOrderItem[] }) | null> {
    const { data, error } = await db()
      .from('orders')
      .select('*, order_items(*)')
      .ilike('number', number)
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return (data as never) ?? null;
  },

  async getBySessionId(sessionId: string): Promise<(DbOrder & { order_items: DbOrderItem[] }) | null> {
    const { data, error } = await db().from('orders').select('*, order_items(*)').eq('stripe_session_id', sessionId).maybeSingle();
    if (error) throw error;
    return (data as never) ?? null;
  },

  async listByEmail(email: string): Promise<(DbOrder & { order_items: DbOrderItem[] })[]> {
    const { data, error } = await db()
      .from('orders')
      .select('*, order_items(*)')
      .eq('email', email.toLowerCase())
      .order('placed_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as never;
  },

  async listByUserId(userId: string): Promise<(DbOrder & { order_items: DbOrderItem[] })[]> {
    const { data, error } = await db()
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('placed_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as never;
  },

  async adminList(opts: { page: number; limit: number; q?: string; status?: string; fulfillmentStatus?: string }): Promise<{ rows: (DbOrder & { order_items: DbOrderItem[] })[]; total: number }> {
    let query = db().from('orders').select('*, order_items(*)', { count: 'exact' }).order('placed_at', { ascending: false }).order('id', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.fulfillmentStatus) query = query.eq('fulfillment_status', opts.fulfillmentStatus);
    if (opts.q) {
      // ILIKE aliases every '*' to '%'; escaped IMATCH keeps all input literal.
      const pattern = opts.q.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
      const literal = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      query = query.or('number.imatch."' + literal + '",email.imatch."' + literal + '"');
    }
    const from = (opts.page - 1) * opts.limit;
    const { data, error, count } = await query.range(from, from + opts.limit - 1);
    if (error) throw error;
    return { rows: (data ?? []) as never, total: count ?? 0 };
  },

  async getOperations(id: string) {
    const [incidents, notifications] = await Promise.all([
      db().from('order_operational_incidents').select('*').eq('order_id', id).order('created_at'),
      db().from('order_notification_outbox').select('id,type,status,attempts,last_error,created_at,sent_at,next_attempt_at').eq('order_id', id).order('created_at'),
    ]);
    if (incidents.error) throw incidents.error;
    if (notifications.error) throw notifications.error;
    return { incidents: incidents.data ?? [], notifications: notifications.data ?? [] };
  },

  async adminOperation(id: string, input: { action: 'advance' | 'tracking' | 'note'; expectedStatus?: OrderStatus; status?: OrderStatus; tracking?: Record<string, unknown>; expectedTracking?: Record<string, unknown>; note?: string; actor: string }): Promise<DbOrder & { order_items: DbOrderItem[] }> {
    const { data, error } = await db().rpc('admin_update_order_operation', {
      p_order_id: id, p_action: input.action, p_expected_status: input.expectedStatus ?? null,
      p_status: input.status ?? null, p_tracking: input.tracking ?? {}, p_expected_tracking: input.expectedTracking ?? null,
      p_note: input.note ?? null, p_actor: input.actor,
    });
    if (error) {
      if (error.code === 'P0002') throw AppError.notFound('order_not_found', 'Commande introuvable.');
      if (error.code === '23514') throw AppError.conflict('order_operation_conflict', 'La commande a changé ou cette action est indisponible ; rechargez-la avant de poursuivre.');
      throw AppError.serviceUnavailable('order_operation_unconfirmed', 'L’opération n’a pas été confirmée ; rechargez la commande.');
    }
    if (!data || typeof data !== 'object' || !data.id) throw AppError.serviceUnavailable('order_operation_unconfirmed', 'L’opération n’a pas été confirmée.');
    return data as DbOrder & { order_items: DbOrderItem[] };
  },

  async setStatus(
    id: string,
    status: OrderStatus,
    extra: Partial<Pick<DbOrder, 'tracking_carrier' | 'tracking_number' | 'tracking_url' | 'paid_at' | 'shipped_at' | 'delivered_at' | 'cancelled_at'>> = {}
  ): Promise<DbOrder> {
    const { data, error } = await db().from('orders').update({ status, ...extra }).eq('id', id).select().single();
    if (error) throw error;
    return data as DbOrder;
  },

  async setSessionId(id: string, sessionId: string): Promise<void> {
    const { error } = await db().from('orders').update({ stripe_session_id: sessionId }).eq('id', id);
    if (error) throw error;
  },

  /* ---------- payments ---------- */

  async createPayment(orderId: string, amountCents: number, currency: string, stripeSessionId?: string | null): Promise<void> {
    const { error } = await db().from('payments').insert({
      order_id: orderId,
      provider: 'stripe',
      amount_cents: amountCents,
      currency,
      status: 'pending',
      stripe_session_id: stripeSessionId ?? null,
    });
    if (error) throw error;
  },

  async getPaymentByIntentId(intentId: string): Promise<{ id: string; order_id: string; status: string; amount_cents: number; refunded_cents: number } | null> {
    const { data, error } = await db().from('payments').select('*').eq('stripe_payment_intent_id', intentId).maybeSingle();
    if (error) throw error;
    return (data as never) ?? null;
  },

  async getPaymentByOrderId(orderId: string): Promise<{ id: string; status: string; stripe_payment_intent_id: string | null; amount_cents: number; refunded_cents: number; stripe_session_id: string | null } | null> {
    const { data, error } = await db().from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return (data as never) ?? null;
  },

  async updatePaymentBySession(sessionId: string, patch: { status?: string; stripe_payment_intent_id?: string | null }): Promise<void> {
    const { error } = await db().from('payments').update({ ...patch, updated_at: new Date().toISOString() }).eq('stripe_session_id', sessionId);
    if (error) throw error;
  },

  async recordRefund(input: RecordRefundInput): Promise<RecordedRefund> {
    const { data, error } = await db().rpc('record_order_refund', {
      p_event_id: input.eventId, p_charge_id: input.chargeId, p_payment_intent_id: input.paymentIntentId,
      p_amount_cents: input.amountCents, p_refunded_cents: input.refundedCents, p_currency: input.currency,
    });
    if (error) {
      if (error.code === 'P0002') throw AppError.serviceUnavailable('refund_payment_unresolved', 'Le paiement doit être rapproché avant de traiter le remboursement.');
      if (error.code === '23514' || error.code === '23505') throw AppError.conflict('refund_conflict', 'Le remboursement ne correspond pas au paiement enregistré.');
      throw AppError.serviceUnavailable('refund_recording_unconfirmed', 'Le remboursement doit être repris ; son enregistrement n’est pas confirmé.');
    }
    const result = data as RecordedRefund | null;
    if (!result || typeof result.order_id !== 'string' || typeof result.payment_id !== 'string'
      || !Number.isSafeInteger(result.observed_refunded_cents) || result.observed_refunded_cents <= 0 || result.observed_refunded_cents > input.amountCents
      || result.reconciliation_required !== true
      || typeof result.duplicate !== 'boolean' || typeof result.changed !== 'boolean') {
      throw AppError.serviceUnavailable('refund_recording_unconfirmed', 'L’enregistrement du remboursement n’est pas confirmé.');
    }
    return result;
  },

  /* ---------- customers ---------- */

  async upsertCustomer(input: { email: string; firstName: string; lastName: string; phone?: string | null; userId?: string | null }): Promise<{ id: string }> {
    const c = db();
    const email = input.email.toLowerCase();
    const { data: existing } = await c.from('customers').select('id').eq('email', email).maybeSingle();
    if (existing) {
      const { error } = await c
        .from('customers')
        .update({ first_name: input.firstName, last_name: input.lastName, phone: input.phone ?? null, user_id: input.userId ?? undefined })
        .eq('id', existing.id as string);
      if (error) throw error;
      return { id: existing.id as string };
    }
    const { data, error } = await c
      .from('customers')
      .insert({ email, first_name: input.firstName, last_name: input.lastName, phone: input.phone ?? null, user_id: input.userId ?? null })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id as string };
  },

  async addAddress(customerId: string, address: AddressSnapshot): Promise<void> {
    const { error } = await db().from('addresses').insert({
      customer_id: customerId,
      type: 'shipping',
      line1: address.line1,
      line2: address.line2 ?? null,
      postal_code: address.postalCode,
      city: address.city,
      country: address.country,
    });
    if (error) throw error;
  },

  async adminListCustomers(opts: { page: number; limit: number; q?: string }): Promise<{ rows: { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string; ordersCount: number; totalSpentCents: number }[]; total: number }> {
    const c = db();
    let query = c.from('customers').select('id,email,first_name,last_name,created_at,orders:orders(id,total_cents,status)', { count: 'exact' }).order('created_at', { ascending: false });
    if (opts.q) query = query.or(`email.ilike.%${opts.q}%,first_name.ilike.%${opts.q}%,last_name.ilike.%${opts.q}%`);
    const from = (opts.page - 1) * opts.limit;
    const { data, error, count } = await query.range(from, from + opts.limit - 1);
    if (error) throw error;
    const rows = ((data ?? []) as unknown as { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string; orders?: { id: string; total_cents: number; status: string }[] }[]).map(
      (r) => {
        const paidOrders = (r.orders ?? []).filter((o) => !['pending', 'cancelled'].includes(o.status));
        return {
          id: r.id,
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          created_at: r.created_at,
          ordersCount: (r.orders ?? []).length,
          totalSpentCents: paidOrders.reduce((s, o) => s + o.total_cents, 0),
        };
      }
    );
    return { rows, total: count ?? 0 };
  },
};
