import type { DbOrder, DbOrderItem, OrderDTO, OrderStatus } from '../types/index.js';

export const PAID_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered', 'partially_refunded', 'refunded'];

/** Allowed status transitions (DECISIONS.md D020). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'shipped', 'cancelled', 'partially_refunded', 'refunded'],
  processing: ['shipped', 'cancelled', 'partially_refunded', 'refunded'],
  shipped: ['delivered', 'partially_refunded', 'refunded'],
  delivered: ['partially_refunded', 'refunded'],
  cancelled: [],
  partially_refunded: ['partially_refunded', 'refunded'],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'En attente de paiement',
    paid: 'Payée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    partially_refunded: 'Remboursée partiellement',
    refunded: 'Remboursée',
  };
  return labels[status];
}

export function toOrderDTO(row: DbOrder & { order_items?: DbOrderItem[] }): OrderDTO {
  return {
    id: row.id,
    number: row.number,
    email: row.email,
    status: row.status,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    shippingMethod: row.shipping_method,
    discountCode: row.discount_code,
    shippingAddress: row.shipping_address,
    items: (row.order_items ?? []).map((it) => ({
      sku: it.sku,
      productName: it.product_name,
      variantTitle: it.variant_title,
      unitPriceCents: it.unit_price_cents,
      quantity: it.quantity,
      totalCents: it.total_cents,
      imageUrl: it.image_url,
    })),
    tracking: { carrier: row.tracking_carrier, number: row.tracking_number, url: row.tracking_url },
    placedAt: row.placed_at,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
  };
}
