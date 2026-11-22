import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStatsOverview } from '../src/services/stats.js';
import { db } from '../src/lib/supabase.js';
import { catalogRepo } from '../src/repositories/catalog.js';
import { newsletterRepo } from '../src/repositories/misc.js';
vi.mock('../src/lib/supabase.js', () => ({ db: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
function setup(overrides: Record<string, unknown> = {}) {
  vi.spyOn(catalogRepo, 'adminListLowStock').mockResolvedValue([]);
  vi.spyOn(newsletterRepo, 'countSubscribed').mockResolvedValue(0);
  vi.mocked(db).mockReturnValue({ from: (table: string) => {
    const result = { data: [], count: 0, error: null, ...(table === 'orders' ? overrides : {}) };
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'in', 'eq']) query[method] = () => query;
    query.limit = () => Promise.resolve(result);
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return query;
  } } as never);
}
describe('truthful dashboard aggregation', () => {
  it('reports real zero values on an empty database', async () => {
    setup(); const result = await getStatsOverview();
    expect(result.orders.total).toBe(0);
    expect(result.revenue.netCents).toBe(0);
    expect(result.operations).toEqual({ openIncidents: 0, blockedOrders: 0, pendingNotifications: 0, failedNotifications: 0 });
  });
  it('does not disguise failed reads as an empty store', async () => {
    setup({ error: { message: 'unavailable' } });
    await expect(getStatsOverview()).rejects.toMatchObject({ code: 'stats_incomplete' });
  });
  it('does not present truncated rows as full revenue totals', async () => {
    setup({ count: 2, data: [] });
    await expect(getStatsOverview()).rejects.toMatchObject({ code: 'stats_incomplete' });
  });
});
