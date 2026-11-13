import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const state = vi.hoisted(() => ({ provider: 'supabase', production: false }));
const auth = vi.hoisted(() => ({
  signUp: vi.fn(), signInWithPassword: vi.fn(), getUser: vi.fn(),
  refreshSession: vi.fn(), setSession: vi.fn(), signOut: vi.fn(),
}));
const client = vi.hoisted(() => vi.fn(() => ({ auth })));
vi.mock('@supabase/supabase-js', () => ({ createClient: client }));
vi.mock('../src/config.js', () => ({
  config: () => ({ AUTH_PROVIDER: state.provider, SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', JWT_SECRET: 'unit-test-only-secret',
    NODE_ENV: state.production ? 'production' : 'test' }),
  isProduction: () => state.production,
  features: { database: () => false, email: () => false },
}));

import { authService } from '../src/services/auth.js';
import { authController } from '../src/controllers/auth.js';
import { publicAuthClient, supabaseAuth } from '../src/lib/supabase-auth.js';
import { optionalUser, requireUser, requireAdmin } from '../src/middleware/auth.js';
import { signUserToken, signAdminToken } from '../src/lib/jwt.js';

const user = { id: 'user-auth-1', email: 'test@example.fr', created_at: '2026-01-01',
  user_metadata: { first_name: 'Test', role: 'admin' } };
const session = { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600, user };
let server: http.Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json(), cookieParser());
  app.use(optionalUser);
  app.post('/login', authController.login);
  app.post('/refresh', authController.refresh);
  app.post('/logout', authController.logout);
  app.get('/me', requireUser, authController.me);
  app.patch('/me', requireUser, authController.updateProfile);
  app.get('/identity', requireUser, (req, res) => res.json((req as express.Request & { user?: unknown }).user));
  app.get('/admin', requireAdmin, (_req, res) => res.json({ ok: true }));
  app.use((err: { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status ?? 500).json({ code: err.code ?? 'error' });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  vi.clearAllMocks();
  state.provider = 'supabase'; state.production = false;
  auth.signUp.mockResolvedValue({ data: { session }, error: null });
  auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
  auth.getUser.mockResolvedValue({ data: { user }, error: null });
  auth.refreshSession.mockResolvedValue({ data: { session: { ...session, access_token: 'access-2', refresh_token: 'refresh-2' } }, error: null });
  auth.setSession.mockResolvedValue({ data: { session }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});
const request = (path: string, init: RequestInit = {}) => fetch(`${base}${path}`, {
  ...init, headers: { Connection: 'close', ...init.headers },
});

describe('Supabase Auth opt-in', () => {
  it('crée des clients publics isolés et sans persistance', () => {
    publicAuthClient(); publicAuthClient();
    expect(client).toHaveBeenCalledTimes(2);
    expect(client).toHaveBeenCalledWith('https://example.supabase.co', 'sb_publishable_test', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
  it('inscrit via Supabase sans JWT maison', async () => {
    const result = await authService.register({ email: user.email, password: 'password123', marketingOptin: false });
    expect(result.token).toBe('access-1');
    expect(result.refreshToken).toBe('refresh-1');
    expect(auth.signUp).toHaveBeenCalledTimes(1);
  });
  it('ne connecte pas une inscription exigeant confirmation email', async () => {
    auth.signUp.mockResolvedValue({ data: { user, session: null }, error: null });
    await expect(supabaseAuth.register({ email: user.email, password: 'password123' })).rejects.toMatchObject({ code: 'email_confirmation_required' });
  });
  it('rejette credentials inconnus sans divulguer erreur prestataire', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'internal detail' } });
    await expect(authService.login(user.email, 'wrong')).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
  it('login pose tokens httpOnly, durée access bornée et ne les expose pas JSON', async () => {
    const res = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'password123' }) });
    const cookies = res.headers.get('set-cookie') ?? '';
    expect(res.status).toBe(200);
    expect(cookies).toContain('boreale_token=access-1'); expect(cookies).toContain('Max-Age=3600');
    expect(cookies).toContain('boreale_refresh=refresh-1'); expect(cookies).toContain('Path=/api/auth');
    expect(cookies).toContain('HttpOnly');
    const body = await res.json() as { data: { id: string }; token?: string };
    expect(body.data.id).toBe(user.id); expect(body.token).toBeUndefined();
  });
  it('valide getUser serveur et ignore role user_metadata', async () => {
    const res = await request('/identity', { headers: { Cookie: 'boreale_token=access-1' } });
    expect(await res.json()).toEqual({ sub: user.id, email: user.email, kind: 'user' });
    expect(auth.getUser).toHaveBeenCalledWith('access-1');
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });
  it('réutilise validation dans une seule requête, jamais entre deux clients', async () => {
    const first = await request('/me', { headers: { Cookie: 'boreale_token=access-1' } });
    expect(first.status).toBe(200); expect(auth.getUser).toHaveBeenCalledTimes(1);
    auth.getUser.mockResolvedValue({ data: { user: { ...user, id: 'second-user' } }, error: null });
    const second = await request('/me', { headers: { Cookie: 'boreale_token=access-2' } });
    expect((await second.json() as { data: { id: string } }).data.id).toBe('second-user');
    expect(auth.getUser).toHaveBeenCalledTimes(2);
  });
  it('ne replie pas sur JWT legacy quand Supabase rejette le token', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const res = await request('/identity', { headers: { Authorization: `Bearer ${signUserToken({ sub: 'legacy-id', email: user.email })}` } });
    expect(res.status).toBe(401);
  });
  it('conserve le contrat legacy et admin séparé', async () => {
    state.provider = 'legacy';
    const res = await request('/identity', { headers: { Authorization: `Bearer ${signUserToken({ sub: 'legacy-id', email: user.email })}` } });
    expect(res.status).toBe(200); expect(auth.getUser).not.toHaveBeenCalled();
    state.provider = 'supabase';
    const admin = await request('/admin', { headers: { Authorization: `Bearer ${signAdminToken({ sub: 'admin-id', email: user.email, role: 'admin' })}` } });
    expect(admin.status).toBe(200);
  });
  it('refresh explicite fait tourner les deux cookies', async () => {
    const res = await request('/refresh', { method: 'POST', headers: { Cookie: 'boreale_refresh=refresh-1' } });
    expect(res.status).toBe(200);
    expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'refresh-1' });
    expect(res.headers.get('set-cookie')).toContain('boreale_token=access-2');
    expect(res.headers.get('set-cookie')).toContain('boreale_refresh=refresh-2');
  });
  it('refresh rejeté efface les cookies et exige reconnexion', async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: {} });
    const res = await request('/refresh', { method: 'POST', headers: { Cookie: 'boreale_refresh=bad' } });
    expect(res.status).toBe(401); expect(res.headers.get('set-cookie')).toContain('boreale_refresh=;');
  });
  it('logout nettoie même si fournisseur indisponible, sans prétendre révocation', async () => {
    auth.signOut.mockResolvedValue({ error: {} });
    const res = await request('/logout', { method: 'POST', headers: { Cookie: 'boreale_token=access-1; boreale_refresh=refresh-1' } });
    expect(await res.json()).toEqual({ ok: true, remoteRevoked: false });
    expect(res.headers.get('set-cookie')).toContain('boreale_token=;');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('bloque profil incompatible et ne fabrique pas de user legacy', async () => {
    const res = await request('/me', { method: 'PATCH', headers: { Cookie: 'boreale_token=access-1', 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: 'X' }) });
    expect(res.status).toBe(503); expect(await res.json()).toEqual({ code: 'profile_schema_pending' });
  });
});
