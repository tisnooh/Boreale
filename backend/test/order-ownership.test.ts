import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { ordersRepo } from '../src/repositories/orders.js';
import { signAdminToken, signUserToken } from '../src/lib/jwt.js';

// HTTP/auth are real; all persistence is replaced. No database or provider is contacted.
const order = {
  id: '550e8400-e29b-41d4-a716-446655440001', number: 'BOR-2026-000001',
  user_id: null, email: 'victim@example.fr', status: 'paid', currency: 'EUR',
  total_cents: 1000, subtotal_cents: 1000, discount_cents: 0, shipping_cents: 0,
  shipping_method: 'standard', shipping_address: { line1: 'Adresse privée' },
  order_items: [], placed_at: '2026-11-13T00:00:00Z',
};

let server: http.Server;
let base: string;
beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
beforeEach(() => {
  vi.spyOn(ordersRepo, 'getById').mockResolvedValue(order as never);
  vi.spyOn(ordersRepo, 'listByUserId').mockResolvedValue([]);
  vi.spyOn(ordersRepo, 'listByEmail').mockResolvedValue([order as never]);
});
afterEach(() => vi.restoreAllMocks());

function userHeaders(email = order.email) {
  return { Authorization: `Bearer ${signUserToken({ sub: 'attacker-id', email })}` };
}

// Avoid reused idle sockets expiring during CPU-bound parallel build/typecheck on Windows.
function request(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, headers: { ...options.headers, Connection: 'close' } });
}

describe('isolation HTTP des commandes', { timeout: 30000 }, () => {
  it('refuse une commande invitée malgré le même email non vérifié', async () => {
    const res = await request(`${base}/api/orders/${order.id}`, { headers: userHeaders() });
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain('Adresse privée');
  });
  it('refuse aussi la commande d’un autre user_id même avec le même email', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, user_id: 'victim-id' } as never);
    const res = await request(`${base}/api/orders/${order.id}`, { headers: userHeaders() });
    expect(res.status).toBe(403);
  });
  it('accepte le propriétaire identifié même si son email diffère du snapshot', async () => {
    vi.mocked(ordersRepo.getById).mockResolvedValue({ ...order, user_id: 'attacker-id' } as never);
    const res = await request(`${base}/api/orders/${order.id}`, { headers: userHeaders('changed@example.fr') });
    expect(res.status).toBe(200);
    expect((await res.json() as { data: { id: string } }).data.id).toBe(order.id);
  });
  it('conserve l’accès administrateur', async () => {
    const token = signAdminToken({ sub: 'admin-id', email: 'admin@example.fr', role: 'admin' });
    expect((await request(`${base}/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(200);
  });
  it('ne fusionne aucune commande invitée dans la liste par email', async () => {
    const res = await request(`${base}/api/me/orders`, { headers: userHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [] });
    expect(ordersRepo.listByUserId).toHaveBeenCalledWith('attacker-id');
    expect(ordersRepo.listByEmail).not.toHaveBeenCalled();
  });
  it('refuse un visiteur sans session avant accès au dépôt', async () => {
    expect((await request(`${base}/api/orders/${order.id}`)).status).toBe(401);
    expect(ordersRepo.getById).not.toHaveBeenCalled();
  });
});
