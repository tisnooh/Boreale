import type { Response } from 'express';
import { config, isProduction } from '../config.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import type { AuthedRequest, } from '../middleware/auth.js';
import { ADMIN_COOKIE, USER_COOKIE, REFRESH_COOKIE } from '../middleware/auth.js';
import { authService, type AuthResult } from '../services/auth.js';
import { authUserDTO, supabaseAuth } from '../lib/supabase-auth.js';
import { usersRepo } from '../repositories/users.js';
import type { Request } from 'express';

const DAY = 86_400_000;

function cookieOptions(kind: 'user' | 'admin') {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: (isProduction() ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: kind === 'user' ? 30 * DAY : 12 * 60 * 60 * 1000,
  };
}

function setUserCookies(res: Response, result: AuthResult) {
  res.cookie(USER_COOKIE, result.token, {
    ...cookieOptions('user'),
    ...(result.expiresIn !== undefined ? { maxAge: result.expiresIn * 1000 } : {}),
  });
  if (result.refreshToken) res.cookie(REFRESH_COOKIE, result.refreshToken, {
    ...cookieOptions('user'), path: '/api/auth',
  });
}

function clearUserCookies(res: Response) {
  const { maxAge: _maxAge, ...options } = cookieOptions('user');
  res.clearCookie(USER_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, { ...options, path: '/api/auth' });
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    setUserCookies(res, result);
    res.status(201).json({ data: result.user });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body.email, req.body.password);
    setUserCookies(res, result);
    res.json({ data: result.user });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    let revoked = config().AUTH_PROVIDER !== 'supabase';
    if (config().AUTH_PROVIDER === 'supabase') {
      const access = req.cookies?.[USER_COOKIE];
      const refresh = req.cookies?.[REFRESH_COOKIE];
      if (access && refresh) {
        try { await supabaseAuth.logout(access, refresh); revoked = true; } catch { /* Always clear local cookies, report revocation gap. */ }
      }
    }
    clearUserCookies(res);
    res.json({ ok: true, ...(config().AUTH_PROVIDER === 'supabase' ? { remoteRevoked: revoked } : {}) });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    if (config().AUTH_PROVIDER !== 'supabase') throw AppError.notFound();
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) throw AppError.unauthorized('auth_required', 'Reconnectez-vous.');
    try {
      const result = await supabaseAuth.refresh(refresh);
      setUserCookies(res, result);
      res.json({ data: result.user });
    } catch (error) {
      clearUserCookies(res);
      throw error;
    }
  }),

  me: asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (config().AUTH_PROVIDER === 'supabase') {
      if (!req.authUser) throw AppError.unauthorized('auth_required', 'Connexion requise.');
      res.json({ data: authUserDTO(req.authUser) });
      return;
    }
    const user = await authService.me(req.user!.sub);
    res.json({ data: user });
  }),

  updateProfile: asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (config().AUTH_PROVIDER === 'supabase') {
      throw AppError.serviceUnavailable('profile_schema_pending', 'La liaison sécurisée des profils Supabase est en préparation.');
    }
    await usersRepo.updateProfile(req.user!.sub, req.body);
    res.json({ data: await authService.me(req.user!.sub) });
  }),

  adminLogin: asyncHandler(async (req: Request, res: Response) => {
    const { token, admin } = await authService.adminLogin(req.body.email, req.body.password);
    res.cookie(ADMIN_COOKIE, token, cookieOptions('admin'));
    res.json({ data: admin });
  }),

  adminMe: asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.admin) throw AppError.unauthorized();
    res.json({ data: { id: req.admin.sub, email: req.admin.email, role: req.admin.role } });
  }),

  adminLogout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(ADMIN_COOKIE, { path: '/' });
    res.json({ ok: true });
  }),
};
