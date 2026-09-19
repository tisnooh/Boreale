import { describe, expect, it, vi } from 'vitest';
import { createCheckout, type CheckoutDeps } from '../src/services/checkout.js';
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
    products: { id: 'p1', name: 'Chaussettes polaires « Nuage »', is_active: true, image_url: '/products/x.svg' },
    inventory: { quantity: 10 },
  },
  {
    id: VAR_B,
    sku: 'BOR-GGP-U',
    title: 'Taille unique',
    price_cents: 1290,
    is_active: true,
    products: { id: 'p2', name: 'Gant grattoir « Polaire »', is_active: true, image_url: null },
    inventory: { quantity: 1 },
  },
];

function makeDeps(overrides: Partial<CheckoutDeps> = {}) {
  const created: Record<string, unknown> = {};
  const deps: CheckoutDeps = {
    getVariantsByIds: vi.fn(async (ids: string[]) => variants.filter((v) => ids.includes(v.id)) as never),
    findUserByEmail: vi.fn(async () => null),
    upsertCustomer: vi.fn(async () => ({ id: 'cust-1' })),
    addAddress: vi.fn(async () => undefined),
    findActiveDiscount: vi.fn(async () => null),
    createOrder: vi.fn(async (input) => {
      created.order = input;
      return { id: 'order-1', number: 'BOR-2026-000001' };
    }),
    createPayment: vi.fn(async () => {
      created.payment = true;
    }),
    createStripeSession: vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1' })),
    ...overrides,
  };
  return { deps, created };
}

const baseInput: CheckoutInput = {
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

  it('session Stripe sans URL → 502', async () => {
    const { deps } = makeDeps({ createStripeSession: vi.fn(async () => ({ id: 'cs_x', url: null })) });
    await expect(createCheckout(baseInput, deps)).rejects.toMatchObject({ status: 502 });
  });

  it('utilisateur connu → user_id lié à la commande', async () => {
    const { deps, created } = makeDeps({ findUserByEmail: vi.fn(async () => ({ id: 'user-9' })) });
    await createCheckout(baseInput, deps);
    expect((created.order as { userId: string }).userId).toBe('user-9');
  });
});
