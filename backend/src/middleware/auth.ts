import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AdminTokenPayload, type UserTokenPayload } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';

export const USER_COOKIE = 'boreale_token';
export const ADMIN_COOKIE = 'boreale_admin';

export interface AuthedRequest extends Request {
  user?: UserTokenPayload;
  admin?: AdminTokenPayload;
}

function readToken(req: Request, cookieName: string): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[cookieName];
  return fromCookie ?? null;
}

/** Attaches req.user when a valid user token is present; never throws. */
export function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = readToken(req, USER_COOKIE);
  if (token) {
    const payload = verifyToken(token);
    if (payload?.kind === 'user') req.user = payload;
  }
  next();
}

export function requireUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  optionalUser(req, _res, () => {
    if (!req.user) return next(AppError.unauthorized('auth_required', 'Connexion requise pour accéder à cette ressource.'));
    next();
  });
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = readToken(req, ADMIN_COOKIE);
  if (!token) return next(AppError.unauthorized('admin_auth_required', 'Authentification admin requise.'));
  const payload = verifyToken(token);
  if (!payload || payload.kind !== 'admin') {
    return next(AppError.unauthorized('admin_auth_invalid', 'Session admin invalide ou expirée.'));
  }
  req.admin = payload;
  next();
}
