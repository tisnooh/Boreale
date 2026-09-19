import { db } from '../lib/supabase.js';
import { catalogRepo } from '../repositories/catalog.js';
import { newsletterRepo } from '../repositories/misc.js';
import { PAID_STATUSES, toOrderDTO } from './orders.js';
import type { DbOrder, OrderStatus } from '../types/index.js';

export interface StatsOverview {
  revenue: { grossCents: number; refundedCents: number; netCents: number; last30dCents: number };
  orders: { total: number; byStatus: Record<string, number>; aovCents: number };
  series: { date: string; revenueCents: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenueCents: number }[];
  lowStock: { sku: string; product: string; quantity: number; threshold: number }[];
  newsletterSubscribers: number;
  recentOrders: { id: string; number: string; status: OrderStatus; totalCents: number; placedAt: string }[];
}

/** Real aggregates from the database — no fabricated numbers, ever. */
export async function getStatsOverview(): Promise<StatsOverview> {
  const c = db();

  const [{ data: ordersData }, { data: itemsData }, { data: paymentsData }, lowStock, newsletterSubscribers] = await Promise.all([
    c.from('orders').select('id,number,status,total_cents,placed_at').order('placed_at', { ascending: false }).limit(5000),
    c.from('order_items').select('product_name,quantity,total_cents,orders!inner(status)').in('orders.status', PAID_STATUSES).limit(5000),
    c.from('payments').select('refunded_cents'),
    catalogRepo.adminListLowStock(),
    newsletterRepo.countSubscribed(),
  ]);

  const orders = (ordersData ?? []) as Pick<DbOrder, 'id' | 'number' | 'status' | 'total_cents' | 'placed_at'>[];
  const items = (itemsData ?? []) as unknown as { product_name: string; quantity: number; total_cents: number }[];
  const payments = (paymentsData ?? []) as { refunded_cents: number }[];

  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const grossCents = paid.reduce((s, o) => s + o.total_cents, 0);
  const refundedCents = payments.reduce((s, p) => s + (p.refunded_cents ?? 0), 0);

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const last30dCents = paid.filter((o) => o.placed_at >= cutoff).reduce((s, o) => s + o.total_cents, 0);

  const byStatus: Record<string, number> = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  // 14-day revenue series (days with no orders = 0)
  const series: StatsOverview['series'] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const dayOrders = paid.filter((o) => o.placed_at.slice(0, 10) === day);
    series.push({ date: day, revenueCents: dayOrders.reduce((s, o) => s + o.total_cents, 0), orders: dayOrders.length });
  }

  // Top products by quantity (paid orders only)
  const agg = new Map<string, { quantity: number; revenueCents: number }>();
  for (const it of items) {
    const cur = agg.get(it.product_name) ?? { quantity: 0, revenueCents: 0 };
    cur.quantity += it.quantity;
    cur.revenueCents += it.total_cents;
    agg.set(it.product_name, cur);
  }
  const topProducts = [...agg.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    revenue: { grossCents, refundedCents, netCents: grossCents - refundedCents, last30dCents },
    orders: { total: orders.length, byStatus, aovCents: paid.length > 0 ? Math.round(grossCents / paid.length) : 0 },
    series,
    topProducts,
    lowStock: lowStock.slice(0, 8).map((v) => ({
      sku: v.sku,
      product: (v.products as { name: string }).name,
      quantity: (v.inventory as { quantity: number }).quantity,
      threshold: (v.inventory as { low_stock_threshold: number }).low_stock_threshold,
    })),
    newsletterSubscribers,
    recentOrders: orders.slice(0, 8).map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      totalCents: o.total_cents,
      placedAt: o.placed_at,
    })),
  };
}

export { toOrderDTO };
