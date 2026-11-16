import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, RequestHandler } from 'express';
const state = vi.hoisted(() => ({ secret: 'x'.repeat(40), run: vi.fn().mockResolvedValue({ claimed: 0, accepted: 0, failed: 0 }) }));
vi.mock('../src/config.js', () => ({ config: () => ({ CRON_SECRET: state.secret }) }));
vi.mock('../src/services/order-notifications.js', () => ({ runOrderConfirmations: state.run }));
import { processOrderConfirmations } from '../src/controllers/order-notifications.js';
async function call(authorization?: string) {
  return new Promise<unknown>(resolve => (processOrderConfirmations as RequestHandler)({ headers: { authorization } } as Request, { json: resolve } as Response, resolve));
}
describe('confirmation cron authorization', () => {
  it.each([undefined, 'Bearer invalid', 'Basic ignored'])('rejects missing/invalid secret %#', async auth => {
    state.run.mockClear(); expect(await call(auth)).toMatchObject({ status: 401 }); expect(state.run).not.toHaveBeenCalled();
  });
  it('rejects the development default even if caller knows it', async () => {
    state.secret = 'dev-cron-secret'; state.run.mockClear();
    expect(await call('Bearer dev-cron-secret')).toMatchObject({ status: 401 }); expect(state.run).not.toHaveBeenCalled();
    state.secret = 'x'.repeat(40);
  });
  it('runs bounded worker only after authenticated cron request', async () => {
    expect(await call(`Bearer ${state.secret}`)).toEqual({ data: { claimed: 0, accepted: 0, failed: 0 } });
    expect(state.run).toHaveBeenCalledTimes(1);
  });
});
