import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const KEYLEN = 64;

/** Hash a password with scrypt (Node built-in — no native dependency, Vercel-friendly). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password.normalize('NFKC'), salt, KEYLEN, { N: SCRYPT_N }).toString('hex');
  return `scrypt$${SCRYPT_N}$${salt}$${derived}`;
}

/** Verify a password against a stored hash. Constant-time comparison. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const [, nStr, salt, hash] = parts as [string, string, string, string];
  const n = Number(nStr);
  if (!Number.isInteger(n) || n <= 0) return false;
  const derived = scryptSync(password.normalize('NFKC'), salt, Buffer.from(hash, 'hex').length, { N: n });
  const expected = Buffer.from(hash, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Basic password strength rule (documented in the frontend too). */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('au moins 8 caractères');
  if (!/[a-zA-Z]/.test(password)) issues.push('au moins une lettre');
  if (!/[0-9]/.test(password)) issues.push('au moins un chiffre');
  return issues;
}
