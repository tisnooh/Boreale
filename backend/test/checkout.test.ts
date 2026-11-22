import { describe, expect, it, vi } from 'vitest';
import { createCheckout, type CheckoutDeps } from '../src/services/checkout.js';
import type { CheckoutIntentDeps } from '../src/services/checkout-intents.js';
import type { CheckoutIntent } from '../src/repositories/checkout-intents.js';
import type { CheckoutInput } from '../src/validators/checkout.js';

const VAR_A = '550e8400-e29b-41d4-a716-446655440001';
const VAR_B = '550e8400-e29b-41d4-a716-446655440002';

const variants = [
  {
    id: VAR_A,
    sku: 'BOR-NUA-SM-BN',
    title: 'S/M · Bleu nuit',
    price_cents: 2490,
    is_active: true,
    products: { id: 'p1', name: 'Chaussettes polaires « Nuage »', is_active: true, procurement_status: 'verified', image_url: '/products/x.svg' },
    inventory: { quantity: 10 },
  },
  {
    id: VAR_B,
    sku: 'BOR-GGP-U',
    title: 'Taille unique',
    price_cents: 1290,
    is_active: true,
    products: { id: 'p2', name: 'Gant grattoir « Polaire »', is_active: true, procurement_status: 'verified', image_url: null },
    inventory: { quantity: 1 },
  },
];

function makeDeps(overrides: Partial<CheckoutDeps> = {}) {
  const created: Record<string, unknown> = {};
  let current: CheckoutIntent | null = null;
  const now = Date.now();
  const intents: CheckoutIntentDeps = {
    begin: vi.fn(async (identity, snapshot) => {
      if (!current && snapshot) {
        created.order = { ...snapshot.order, userId: identity.actor };
        current = { id: '550e8400-e29b-41d4-a716-446655440010', order_id: '550e8400-e29b-41d4-a716-446655440011',
          order_number: 'BOR-2026-000001', request_hash: identity.requestHash, state: 'prepared', snapshot,
          stripe_params: null, stripe_key: 'stable-test-key', session_id: null, lease_token: null,
          first_attempt_at: null, retry_deadline: null };
      }
      return current;
    }),
    freeze: vi.fn(async (_id, body) => { current = { ...current!, stripe_params: body }; return current; }),
    claim: vi.fn(async () => { current = { ...current!, state: 'creating', lease_token: 'fixture-lease', retry_deadline: new Date(now + 23 * 3600000).toISOString() }; return current; }),
    bind: vi.fn(async (_id, _token, session) => { created.payment = true; current = { ...current!, state: 'bound', session_id: session.id }; return current; }),
    fail: vi.fn(async () => undefined),
    create: vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1', status: 'open', expires_at: Math.floor(now / 1000) + 86400,
      amount_total: current!.snapshot.totals.totalCents, currency: 'eur',
      metadata: { orderId: current!.order_id, checkoutIntentId: current!.id, brand: 'boreale' } })),
    retrieve: vi.fn(async () => { throw new Error('Unexpected retrieve'); }), now: () => now,
  };
  const deps: CheckoutDeps = {
    intents,
    getVariantsByIds: vi.fn(async (ids: string[]) => variants.filter(v => ids.includes(v.id)) as never),
    findActiveDiscount: vi.fn(async () => null), ...overrides,
  };
  return { deps, created, intents };
}

const baseInput: CheckoutInput = {
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440020', customerMode: 'guest',
  items: [{ variantId: VAR_A, quantity: 2 }],
  discountCode: undefined,
  shippingMethod: 'standard',
  customer: {
    email: 'client@example.fr',
    firstName: 'Camille',
    lastName: 'Durand',
    phone: undefined,
    address: { line1: '12 rue de la Paix', line2: undefined, postalCode: '75002', city: 'Paris', country: 'FR' },
  },
};

describe('createCheckout', () => {
  it.each(['unverified', undefined])('refuse un approvisionnement %s malgré le stock, sans aucun effet', async (status) => {
    const { deps } = makeDeps({ getVariantsByIds: vi.fn(async () => [{ ...variants[0]!, products: {
      ...variants[0]!.products, procurement_status: status,
    } }] as never) });
    await expect(createCheckout(baseInput, deps)).rejects.toMatchObject({ code: 'procurement_unverified' });
    expect(deps.intents!.claim).not.toHaveBeenCalled();
    expect(deps.findActiveDiscount).not.toHaveBeenCalled();
  });

  it('rejette les doublons dont le cumul dépasse le stock avant création', async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...baseInput, items: [{ variantId: VAR_B, quantity: 1 }, { variantId: VAR_B, quantity: 1 }] }, deps)).rejects.toMatchObject({ code: 'insufficient_stock' });
    expect(deps.intents!.claim).not.toHaveBeenCalled();
    expect(deps.intents!.create).not.toHaveBeenCalled();
  });

  it('rejette une quantité cumulée supérieure à 20', async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...baseInput, items: [{ variantId: VAR_A, quantity: 11 }, { variantId: VAR_A, quantity: 10 }] }, deps)).rejects.toMatchObject({ code: 'invalid_quantity' });
    expect(deps.intents!.claim).not.toHaveBeenCalled();
  });

  it('ne retourne aucune URL si la liaison session-commande échoue', async () => {
    const { deps, intents } = makeDeps();
    vi.mocked(intents.bind).mockRejectedValue(new Error('persistence failed'));
    await expect(createCheckout(baseInput, deps)).rejects.toThrow('persistence failed');
    expect(intents.fail).not.toHaveBeenCalled();
  });
  it('happy path : totaux serveur, commande créée, URL Stripe retournée', async () => {
    const { deps, created } = makeDeps();
    const result = await createCheckout(baseInput, deps);
    expect(result.url).toBe('https://checkout.stripe.com/cs_test_1');
    expect(result.orderNumber).toBe('BOR-2026-000001');
    // 2 × 24,90 = 49,80 < 69 € → + 4,90 livraison
    expect(result.totals).toMatchObject({ subtotalCents: 4980, discountCents: 0, shippingCents: 490, totalCents: 5470 });
    const order = created.order as Record<string, unknown> & { items: unknown[] };
    expect(order.email).toBe('client@example.fr');
    expect(order.items).toHaveLength(1);
    expect(created.payment).toBe(true);
  });

  it('le prix vient du serveur, jamais du client', async () => {
    const { deps, created } = makeDeps();
    await createCheckout({ ...baseInput, items: [{ variantId: VAR_A, quantity: 2, ...({ unitPriceCents: 1 } as object) } as never] }, deps);
    const order = created.order as { items: { unit_price_cents: number }[] };
    expect(order.items[0]!.unit_price_cents).toBe(2490);
  });

  it('variante inconnue → 422 variant_not_found', async () => {
    const { deps } = makeDeps();
    await expect(
      createCheckout({ ...baseInput, items: [{ variantId: '550e8400-e29b-41d4-a716-446655449999', quantity: 1 }] }, deps)
    ).rejects.toMatchObject({ status: 422, code: 'variant_not_found' });
  });

  it('stock insuffisant → 409 insufficient_stock', async () => {
    const { deps } = makeDeps();
    await expect(createCheckout({ ...baseInput, items: [{ variantId: VAR_B, quantity: 2 }] }, deps)).rejects.toMatchObject({
      status: 409,
      code: 'insufficient_stock',
    });
  });

  it('lignes dupliquées fusionnées', async () => {
    const { deps, created } = makeDeps();
    await createCheckout(
      { ...baseInput, items: [{ variantId: VAR_A, quantity: 1 }, { variantId: VAR_A, quantity: 1 }] },
      deps
    );
    const order = created.order as { items: { quantity: number }[] };
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.quantity).toBe(2);
  });

  it('code promo invalide → 422 discount_invalid', async () => {
    const { deps } = makeDeps({ findActiveDiscount: vi.fn(async () => null) });
    await expect(createCheckout({ ...baseInput, discountCode: 'FAKE' }, deps)).rejects.toMatchObject({
      status: 422,
      code: 'discount_invalid',
    });
  });

  it('code promo sous le minimum → 422 discount_not_applicable', async () => {
    const { deps } = makeDeps({
      findActiveDiscount: vi.fn(async () => ({
        code: 'PACK10',
        type: 'fixed',
        value: 1000,
        min_subtotal_cents: 9000,
        max_uses: null,
        used_count: 0,
        starts_at: null,
        ends_at: null,
        is_active: true,
      }) as never),
    });
    await expect(createCheckout({ ...baseInput, discountCode: 'PACK10' }, deps)).rejects.toMatchObject({
      status: 422,
      code: 'discount_not_applicable',
    });
  });

  it('code promo valide appliqué au total', async () => {
    const { deps } = makeDeps({
      findActiveDiscount: vi.fn(async () => ({
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        min_subtotal_cents: 0,
        max_uses: null,
        used_count: 0,
        starts_at: null,
        ends_at: null,
        is_active: true,
      }) as never),
    });
    const result = await createCheckout({ ...baseInput, discountCode: 'welcome10' }, deps);
    expect(result.totals.discountCents).toBe(498);
    expect(result.totals.totalCents).toBe(4980 - 498 + 490);
  });

  it('session Stripe sans URL → refus sans bind', async () => {
    const { deps, intents } = makeDeps();
    const original = vi.mocked(intents.create).getMockImplementation()!;
    vi.mocked(intents.create).mockImplementation(async (body, key) => ({ ...await original(body, key), url: null }));
    await expect(createCheckout(baseInput, deps)).rejects.toMatchObject({ status: 503 });
    expect(intents.bind).not.toHaveBeenCalled();
  });

  it('email connu sans session ne confère pas la propriété de la commande', async () => {
    const { deps, created } = makeDeps();
    await createCheckout(baseInput, deps);
    expect((created.order as { userId: string | null }).userId).toBeNull();
    expect(vi.mocked(deps.intents!.begin).mock.calls[0]![0].actor).toBeNull();
  });

  it('lie uniquement la session authentifiée à la commande', async () => {
    const { deps, created } = makeDeps();
    await createCheckout({ ...baseInput, customerMode: 'customer' }, deps, 'user-authenticated');
    expect((created.order as { userId: string }).userId).toBe('user-authenticated');
  });
});
