import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '../src/validators/checkout.js';
import { discountUpsertSchema, productListQuerySchema } from '../src/validators/catalog.js';
import { registerSchema as authRegister } from '../src/validators/auth.js';

describe('checkoutSchema', () => {
  const valid = {
    items: [{ variantId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    shippingMethod: 'standard',
    customer: {
      email: 'CLIENT@Example.FR ',
      firstName: 'Camille',
      lastName: 'Durand',
      address: { line1: '12 rue de la Paix', postalCode: '75002', city: 'Paris' },
    },
  };

  it('normalise email/minuscules et country par défaut FR', () => {
    const parsed = checkoutSchema.parse(valid);
    expect(parsed.customer.email).toBe('client@example.fr');
    expect(parsed.customer.address.country).toBe('FR');
  });

  it('rejette un code postal invalide', () => {
    const bad = { ...valid, customer: { ...valid.customer, address: { ...valid.customer.address, postalCode: '7500' } } };
    expect(checkoutSchema.safeParse(bad).success).toBe(false);
  });

  it('rejette un panier vide', () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejette quantity > 20 et quantity fractionnaire', () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [{ ...valid.items[0]!, quantity: 21 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [{ ...valid.items[0]!, quantity: 1.5 }] }).success).toBe(false);
  });

  it('rejette un variantId non-UUID', () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [{ variantId: 'abc', quantity: 1 }] }).success).toBe(false);
  });

  it('discountCode vide → undefined', () => {
    const parsed = checkoutSchema.parse({ ...valid, discountCode: '' });
    expect(parsed.discountCode).toBeUndefined();
  });
});

describe('registerSchema', () => {
  it('exige 8+ caractères, une lettre et un chiffre', () => {
    expect(authRegister.safeParse({ email: 'a@b.fr', password: 'abcdef12' }).success).toBe(true);
    expect(authRegister.safeParse({ email: 'a@b.fr', password: 'abcdefg' }).success).toBe(false);
    expect(authRegister.safeParse({ email: 'a@b.fr', password: 'abcdefgh' }).success).toBe(false);
    expect(authRegister.safeParse({ email: 'a@b.fr', password: '12345678' }).success).toBe(false);
  });
  it('email normalisé en minuscules', () => {
    expect(authRegister.parse({ email: ' A@B.FR ', password: 'abcdef12' }).email).toBe('a@b.fr');
  });
});

describe('discountUpsertSchema', () => {
  it('code en majuscules, percentage ≤ 90', () => {
    const parsed = discountUpsertSchema.parse({ code: 'hiver10', type: 'percentage', value: 10 });
    expect(parsed.code).toBe('HIVER10');
    expect(discountUpsertSchema.safeParse({ code: 'X1', type: 'percentage', value: 95 }).success).toBe(false);
  });
  it('dates cohérentes', () => {
    expect(
      discountUpsertSchema.safeParse({
        code: 'TEST1',
        type: 'fixed',
        value: 500,
        startsAt: '2026-12-01T00:00:00Z',
        endsAt: '2026-11-01T00:00:00Z',
      }).success
    ).toBe(false);
  });
});

describe('productListQuerySchema', () => {
  it('valeurs par défaut page/limit/sort + coercion', () => {
    const parsed = productListQuerySchema.parse({ page: '2', limit: '10' });
    expect(parsed).toMatchObject({ page: 2, limit: 10, sort: 'featured' });
  });
  it('limit borné à 50', () => {
    expect(productListQuerySchema.safeParse({ limit: '999' }).success).toBe(false);
  });
});
