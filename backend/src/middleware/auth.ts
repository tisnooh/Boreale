import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AdminTokenPayload, type UserTokenPayload } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { supabaseAuth } from '../lib/supabase-auth.js';
import type { User } from '@supabase/supabase-js';
import { adminUsersRepo } from '../repositories/users.js';

export const USER_COOKIE = 'boreale_token';
export const ADMIN_COOKIE = 'boreale_admin';
export const REFRESH_COOKIE = 'boreale_refresh';

export interface AuthedRequest extends Request {
  user?: UserTokenPayload;
  admin?: AdminTokenPayload;
  authAccessToken?: string;
  authUser?: User;
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
  if (config().AUTH_PROVIDER === 'supabase') {
    if (token && req.authAccessToken === token && req.authUser && req.user) return next();
    delete req.user;
    delete req.authAccessToken;
    delete req.authUser;
    // No local decoding or legacy-token fallback grants identity in this mode.
    if (!token) return next();
    void supabaseAuth.getUser(token).then((user) => {
      if (user.email) {
        req.user = { sub: user.id, email: user.email, kind: 'user' };
        req.authAccessToken = token;
        req.authUser = user;
      }
      next();
    }).catch(() => next());
    return;
  }
  if (token) {
    const payload = verifyToken(token);
    if (payload?.kind === 'user') req.user = payload;
  }
  next();
}

export function requireUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (req.user) return next();
  optionalUser(req, _res, () => {
    if (!req.user) return next(AppError.unauthorized('auth_required', 'Connexion requise pour accéder à cette ressource.'));
    next();
  });
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  delete req.admin;
  const token = readToken(req, ADMIN_COOKIE);
  if (!token) return next(AppError.unauthorized('admin_auth_required', 'Authentification admin requise.'));
  const payload = verifyToken(token);
  if (!payload || payload.kind !== 'admin') {
    return next(AppError.unauthorized('admin_auth_invalid', 'Session admin invalide ou expirée.'));
  }
  // Revocation and role changes apply on the next request, not 12h later.
  void adminUsersRepo.findById(payload.sub).then((admin) => {
    if (!admin?.is_active || !['admin', 'staff'].includes(admin.role)) {
      return next(AppError.unauthorized('admin_auth_invalid', 'Compte administrateur inactif ou introuvable.'));
    }
    req.admin = { sub: admin.id, email: admin.email, role: admin.role, kind: 'admin' };
    next();
  }).catch(() => next(AppError.serviceUnavailable('admin_access_unavailable', 'La vérification de votre accès administrateur est indisponible. Réessayez.')));
}
