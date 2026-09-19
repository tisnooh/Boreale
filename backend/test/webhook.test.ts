import { describe, expect, it, vi } from 'vitest';
import { handleWebhookEvent, type StripeEventLike, type WebhookDeps } from '../src/services/webhooks.js';

function makeDeps(order: Record<string, unknown> | null) {
  const calls: string[] = [];
  const deps: WebhookDeps = {
    getOrderBySessionId: vi.fn(async () => order as never),
    markPaid: vi.fn(async () => { calls.push('markPaid'); }),
    cancelOrder: vi.fn(async () => { calls.push('cancelOrder'); }),
    decrementInventory: vi.fn(async () => { calls.push('decrementInventory'); return 10; }),
    incrementDiscountUsage: vi.fn(async () => { calls.push('incrementDiscountUsage'); }),
    markCartConverted: vi.fn(async () => { calls.push('markCartConverted'); }),
    ensurePaymentSucceeded: vi.fn(async () => { calls.push('ensurePaymentSucceeded'); }),
    handleRefund: vi.fn(async () => { calls.push('handleRefund'); }),
    markPaymentFailed: vi.fn(async () => { calls.push('markPaymentFailed'); }),
    sendEmail: vi.fn(async () => { calls.push('sendEmail'); return { delivered: true }; }),
  };
  return { deps, calls };
}

const paidOrder = {
  id: 'order-1',
  number: 'BOR-2026-000001',
  status: 'pending',
  email: 'client@example.fr',
  total_cents: 6760,
  currency: 'EUR',
  subtotal_cents: 6270,
  discount_cents: 0,
  shipping_cents: 490,
  shipping_method: 'standard',
  discount_code: 'WELCOME10',
  shipping_address: { firstName: 'C', lastName: 'D', line1: '1 rue', postalCode: '75001', city: 'Paris', country: 'FR' },
  tracking_carrier: null,
  tracking_number: null,
  tracking_url: null,
  placed_at: '2026-01-05T10:00:00Z',
  paid_at: null,
  shipped_at: null,
  delivered_at: null,
  cancelled_at: null,
  order_items: [
    { variant_id: 'var-1', quantity: 2, sku: 'BOR-NUA-SM-BN', product_name: 'Chaussettes', variant_title: 'S/M', unit_price_cents: 2490, total_cents: 4980, image_url: null },
    { variant_id: 'var-2', quantity: 1, sku: 'BOR-GGP-U', product_name: 'Gant', variant_title: null, unit_price_cents: 1290, total_cents: 1290, image_url: null },
  ],
};

describe('webhook checkout.session.completed', () => {
  it('marque payé, décrémenté le stock, consomme le code promo, envoie les emails', async () => {
    const { deps, calls } = makeDeps(paidOrder);
    const event: StripeEventLike = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1' } },
    };
    const result = await handleWebhookEvent(event, deps);
    expect(result.handled).toBe(true);
    expect(calls).toContain('markPaid');
    expect(calls).toContain('ensurePaymentSucceeded');
    expect(calls).toContain('incrementDiscountUsage');
    expect(calls).toContain('markCartConverted');
    expect(deps.decrementInventory).toHaveBeenCalledTimes(2);
    expect(deps.decrementInventory).toHaveBeenCalledWith('var-1', 2);
    // confirmation + reçu (+ notification admin si NOTIFY_EMAIL défini)
    expect(calls.filter((c) => c === 'sendEmail').length).toBeGreaterThanOrEqual(2);
  });

  it('idempotent : une commande déjà payée n’est pas retraitée', async () => {
    const { deps, calls } = makeDeps({ ...paidOrder, status: 'paid' });
    const event: StripeEventLike = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1' } },
    };
    await handleWebhookEvent(event, deps);
    expect(calls).not.toContain('markPaid');
  });

  it('ignore une session non payée', async () => {
    const { deps, calls } = makeDeps(paidOrder);
    const event: StripeEventLike = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'unpaid' } },
    };
    const result = await handleWebhookEvent(event, deps);
    expect(result.handled).toBe(false);
    expect(calls).toEqual([]);
  });

  it('commande inconnue → handled false, aucune écriture', async () => {
    const { deps, calls } = makeDeps(null);
    const event: StripeEventLike = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_unknown', payment_status: 'paid' } },
    };
    const result = await handleWebhookEvent(event, deps);
    expect(result.handled).toBe(false);
    expect(calls).toEqual([]);
  });

  it('échec de stock (oversell) : la commande payée reste traitée', async () => {
    const { deps, calls } = makeDeps(paidOrder);
    (deps.decrementInventory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('insufficient_stock'));
    const event: StripeEventLike = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1' } },
    };
    const result = await handleWebhookEvent(event, deps);
    expect(result.handled).toBe(true);
    expect(calls).toContain('markPaid');
  });
});

describe('webhook expiration / remboursement', () => {
  it('checkout.session.expired annule une commande pending', async () => {
    const { deps, calls } = makeDeps(paidOrder);
    await handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, deps);
    expect(calls).toContain('cancelOrder');
  });

  it('n’annule pas une commande déjà payée', async () => {
    const { deps, calls } = makeDeps({ ...paidOrder, status: 'paid' });
    await handleWebhookEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_1' } } }, deps);
    expect(calls).not.toContain('cancelOrder');
  });

  it('charge.refunded déclenche handleRefund avec les montants cumulés', async () => {
    const { deps } = makeDeps(null);
    await handleWebhookEvent(
      { type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount: 6760, amount_refunded: 6760 } } },
      deps
    );
    expect(deps.handleRefund).toHaveBeenCalledWith('pi_1', 6760, 6760);
  });

  it('type inconnu → handled false', async () => {
    const { deps } = makeDeps(null);
    const r = await handleWebhookEvent({ type: 'invoice.paid', data: { object: {} } }, deps);
    expect(r.handled).toBe(false);
  });
});
