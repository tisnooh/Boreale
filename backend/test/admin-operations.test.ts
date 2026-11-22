import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderCapabilities, safeTrackingUrl } from '../src/services/admin-orders.js';
import { orderNoteSchema, orderStatusSchema, orderTrackingSchema } from '../src/validators/catalog.js';
import type { DbOrder } from '../src/types/index.js';
import { ordersRepo } from '../src/repositories/orders.js';
import { db } from '../src/lib/supabase.js';
vi.mock('../src/lib/supabase.js', () => ({ db: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const order = { status: 'paid', fulfillment_status: 'ready', paid_at: '2026-11-16' } as DbOrder;
describe('admin operations capabilities and input', () => {
  it('allows operational steps only with payment and allocation', () => {
    expect(orderCapabilities(order).allowedStatuses).toEqual(['processing', 'shipped']);
    expect(orderCapabilities({ ...order, paid_at: null }).allowedStatuses).toEqual([]);
    expect(orderCapabilities({ ...order, fulfillment_status: 'blocked' }).allowedStatuses).toEqual([]);
    expect(orderCapabilities({ ...order, status: 'shipped' }).canEditTracking).toBe(true);
    expect(orderCapabilities(order).refund.enabled).toBe(false);
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com', 'broken'])('rejects unsafe link %s', (url) => {
    expect(safeTrackingUrl(url)).toBeNull();
    expect(orderStatusSchema.safeParse({ status: 'shipped', expectedStatus: 'paid', trackingUrl: url }).success).toBe(false);
  });
  it('requires CAS and defaults notifications off', () => {
    expect(orderStatusSchema.safeParse({ status: 'shipped' }).success).toBe(false);
    expect(orderStatusSchema.parse({ status: 'processing', expectedStatus: 'paid' }).notify).toBe(false);
    expect(orderTrackingSchema.safeParse({ expectedStatus: 'shipped' }).success).toBe(false);
  });
  it('validates useful bounded notes', () => {
    expect(orderNoteSchema.safeParse({ note: '   ' }).success).toBe(false);
    expect(orderNoteSchema.safeParse({ note: 'x'.repeat(2001) }).success).toBe(false);
    expect(orderNoteSchema.parse({ note: ' Retour à vérifier ' }).note).toBe('Retour à vérifier');
  });
});
describe('admin repository boundaries', () => {
  it('quotes PostgREST grammar and escapes all regex metacharacters, retaining literal star search', async () => {
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }) };
    vi.mocked(db).mockReturnValue({ from: vi.fn().mockReturnValue(query) } as never);
    await ordersRepo.adminList({ page: 1, limit: 25, q: 'a%,_"\\b*^$.+?()[]{}|', fulfillmentStatus: 'blocked' });
    expect(query.eq).toHaveBeenCalledWith('fulfillment_status', 'blocked');
    expect(query.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(query.or).toHaveBeenCalledWith(String.raw`number.imatch."a%,_\"\\\\b\\*\\^\\$\\.\\+\\?\\(\\)\\[\\]\\{\\}\\|",email.imatch."a%,_\"\\\\b\\*\\^\\$\\.\\+\\?\\(\\)\\[\\]\\{\\}\\|"`);
  });
  it('fails closed on missing or conflicting atomic operation', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ error: { code: '23514' } });
    vi.mocked(db).mockReturnValue({ rpc } as never);
    const input = { action: 'note' as const, note: 'test', actor: 'qa@example.invalid' };
    await expect(ordersRepo.adminOperation('id', input)).rejects.toMatchObject({ code: 'order_operation_unconfirmed' });
    await expect(ordersRepo.adminOperation('id', input)).rejects.toMatchObject({ status: 409 });
  });
});
