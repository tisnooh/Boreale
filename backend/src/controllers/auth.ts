import type { Response } from 'express';
import { isProduction } from '../config.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import type { AuthedRequest, } from '../middleware/auth.js';
import { ADMIN_COOKIE, USER_COOKIE } from '../middleware/auth.js';
import { authService } from '../services/auth.js';
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

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { token, user } = await authService.register(req.body);
    res.cookie(USER_COOKIE, token, cookieOptions('user'));
    res.status(201).json({ data: user });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { token, user } = await authService.login(req.body.email, req.body.password);
    res.cookie(USER_COOKIE, token, cookieOptions('user'));
    res.json({ data: user });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(USER_COOKIE, { path: '/' });
    res.json({ ok: true });
  }),

  me: asyncHandler(async (req: AuthedRequest, res: Response) => {
    const user = await authService.me(req.user!.sub);
    res.json({ data: user });
  }),

  updateProfile: asyncHandler(async (req: AuthedRequest, res: Response) => {
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
