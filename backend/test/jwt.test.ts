import { describe, expect, it, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config.js', () => ({
  config: () => ({ JWT_SECRET: 'test-secret', NODE_ENV: 'test' }),
  loadEnv: () => ({ JWT_SECRET: 'test-secret', NODE_ENV: 'test' }),
  isProduction: () => false,
  features: { database: () => false, stripe: () => false, stripeWebhook: () => false, email: () => false },
}));

const { signUserToken, signAdminToken, verifyToken } = await import('../src/lib/jwt.js');

describe('jwt', () => {
  afterEach(() => vi.useRealTimers());

  it('signe et vérifie un token utilisateur', () => {
    const token = signUserToken({ sub: 'user-1', email: 'a@b.fr' });
    const payload = verifyToken(token);
    expect(payload).toMatchObject({ sub: 'user-1', email: 'a@b.fr', kind: 'user' });
  });

  it('signe et vérifie un token admin avec rôle', () => {
    const token = signAdminToken({ sub: 'admin-1', email: 'admin@b.fr', role: 'admin' });
    const payload = verifyToken(token);
    expect(payload).toMatchObject({ kind: 'admin', role: 'admin' });
  });

  it('rejette un token falsifié', () => {
    const token = signUserToken({ sub: 'user-1', email: 'a@b.fr' });
    expect(verifyToken(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('rejette un token expiré', () => {
    vi.useFakeTimers();
    const token = signUserToken({ sub: 'user-1', email: 'a@b.fr' });
    vi.advanceTimersByTime(31 * 86_400_000); // > 30 days
    expect(verifyToken(token)).toBeNull();
  });

  it('rejette une entrée vide ou du texte', () => {
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('nimporte')).toBeNull();
  });

  it.each([
    { sub: {}, email: 'admin@example.invalid', kind: 'admin', role: 'admin' },
    { sub: 'admin', email: ['admin@example.invalid'], kind: 'admin', role: 'admin' },
    { sub: 'admin', email: 'admin@example.invalid', kind: 'admin', role: 'owner' },
    { sub: 'admin', email: 'admin@example.invalid', kind: 'admin' },
  ])('rejette les identités/rôles malformés %#', (payload) => {
    expect(verifyToken(jwt.sign(payload, 'test-secret'))).toBeNull();
  });
});
