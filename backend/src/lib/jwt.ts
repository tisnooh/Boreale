import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface UserTokenPayload {
  sub: string; // user id
  email: string;
  kind: 'user';
}

export interface AdminTokenPayload {
  sub: string; // admin_user id
  email: string;
  role: 'admin' | 'staff';
  kind: 'admin';
}

export type TokenPayload = UserTokenPayload | AdminTokenPayload;

const USER_TTL = '30d';
const ADMIN_TTL = '12h';

export function signUserToken(payload: Omit<UserTokenPayload, 'kind'>): string {
  return jwt.sign({ ...payload, kind: 'user' }, config().JWT_SECRET, { expiresIn: USER_TTL, algorithm: 'HS256' });
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'kind'>): string {
  return jwt.sign({ ...payload, kind: 'admin' }, config().JWT_SECRET, { expiresIn: ADMIN_TTL, algorithm: 'HS256' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config().JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    const p = decoded as Partial<TokenPayload>;
    if (!p.sub || !p.email || (p.kind !== 'user' && p.kind !== 'admin')) return null;
    return p as TokenPayload;
  } catch {
    return null;
  }
}
