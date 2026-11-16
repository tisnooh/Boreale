import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import { requireAdmin, type AuthedRequest } from '../src/middleware/auth.js';
import { adminUsersRepo } from '../src/repositories/users.js';
import { signAdminToken, signUserToken } from '../src/lib/jwt.js';

const active = { id: 'admin', email: 'current@example.invalid', role: 'admin' as const, name: null, is_active: true };
afterEach(() => vi.restoreAllMocks());
async function run(token?: string) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} } as AuthedRequest;
  const error = await new Promise<unknown>((resolve) => requireAdmin(req, {} as Response, ((value?: unknown) => resolve(value)) as NextFunction));
  return { req, error };
}
const token = () => signAdminToken({ sub: 'admin', email: 'old@example.invalid', role: 'admin' });
describe('admin access revalidated on every request', () => {
  it('rejects anonymous/customer before accessing private admin records', async () => {
    const lookup = vi.spyOn(adminUsersRepo, 'findById');
    expect((await run()).error).toMatchObject({ status: 401 });
    expect((await run(signUserToken({ sub: 'client', email: 'client@example.invalid' }))).error).toMatchObject({ status: 401 });
    expect(lookup).not.toHaveBeenCalled();
  });
  it.each([null, { ...active, is_active: false }, { ...active, role: 'invalid' }])('denies revoked/deleted/invalid-role account %#', async (row) => {
    vi.spyOn(adminUsersRepo, 'findById').mockResolvedValue(row as typeof active | null);
    const result = await run(token());
    expect(result.error).toMatchObject({ status: 401 }); expect(result.req.admin).toBeUndefined();
  });
  it('uses current database role and identity rather than stale token claims', async () => {
    vi.spyOn(adminUsersRepo, 'findById').mockResolvedValue({ ...active, role: 'staff' });
    const result = await run(token());
    expect(result.error).toBeUndefined();
    expect(result.req.admin).toMatchObject({ role: 'staff', email: active.email });
  });
  it('fails closed with retriable error when access verification fails', async () => {
    vi.spyOn(adminUsersRepo, 'findById').mockRejectedValue(new Error('private database diagnostic'));
    const result = await run(token());
    expect(result.error).toMatchObject({ status: 503, code: 'admin_access_unavailable' });
    expect(result.req.admin).toBeUndefined();
  });
});
