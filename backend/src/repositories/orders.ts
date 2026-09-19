import { db } from '../lib/supabase.js';
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

export const ordersRepo = {
  async create(input: NewOrderInput): Promise<DbOrder> {
    const c = db();
    const { data: order, error } = await c
      .from('orders')
      .insert({
        customer_id: input.customerId,
        user_id: input.userId,
        email: input.email,
        status: 'pending' satisfies OrderStatus,
        currency: input.currency,
        subtotal_cents: input.subtotalCents,
        discount_cents: input.discountCents,
        shipping_cents: input.shippingCents,
        total_cents: input.totalCents,
        shipping_method: input.shippingMethod,
        discount_code: input.discountCode,
        shipping_address: input.shippingAddress,
        stripe_session_id: input.stripeSessionId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const o = order as DbOrder;

    const items = input.items.map((it) => ({ ...it, order_id: o.id }));
    if (items.length > 0) {
      const { error: itemsError } = await c.from('order_items').insert(items);
      if (itemsError) throw itemsError;
    }
    await this.addEvent(o.id, 'order_created', { number: o.number, totalCents: o.total_cents });
    return o;
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

  async adminList(opts: { page: number; limit: number; q?: string; status?: string }): Promise<{ rows: (DbOrder & { order_items: DbOrderItem[] })[]; total: number }> {
    let query = db().from('orders').select('*, order_items(*)', { count: 'exact' }).order('placed_at', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.q) query = query.or(`number.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);
    const from = (opts.page - 1) * opts.limit;
    const { data, error, count } = await query.range(from, from + opts.limit - 1);
    if (error) throw error;
    return { rows: (data ?? []) as never, total: count ?? 0 };
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

  async markPaymentRefunded(orderId: string, refundedCents: number, totalRefundedCents: number, amountCents: number): Promise<void> {
    const status = totalRefundedCents >= amountCents ? 'refunded' : 'partially_refunded';
    const { error } = await db()
      .from('payments')
      .update({ status, refunded_cents: totalRefundedCents, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
    if (error) throw error;
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
