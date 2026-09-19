import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, passwordIssues } from '../src/lib/password.js';

describe('password (scrypt)', () => {
  it('hash + verify aller-retour', () => {
    const hash = hashPassword('MotDePasse123!');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('MotDePasse123!', hash)).toBe(true);
  });

  it('rejette un mauvais mot de passe', () => {
    const hash = hashPassword('MotDePasse123!');
    expect(verifyPassword('motdepasse123!', hash)).toBe(false);
  });

  it('deux hash du même mot de passe diffèrent (sel aléatoire)', () => {
    expect(hashPassword('abcDEF123')).not.toBe(hashPassword('abcDEF123'));
  });

  it('tolère les hash corrompus sans exception', () => {
    expect(verifyPassword('x', 'pas-un-hash')).toBe(false);
    expect(verifyPassword('x', 'scrypt$abc$salt$hash')).toBe(false);
  });

  it('normalise NFKC (mêmes hash pour formes Unicode équivalentes)', () => {
    const hash = hashPassword('pässwörd123');
    expect(verifyPassword('p\u00E4ssw\u00F6rd123', hash)).toBe(true);
  });

  it('passwordIssues détecte les mots de passe faibles', () => {
    expect(passwordIssues('abc')).toContain('au moins 8 caractères');
    expect(passwordIssues('abcdefgh')).toContain('au moins un chiffre');
    expect(passwordIssues('12345678')).toContain('au moins une lettre');
    expect(passwordIssues('abcd1234')).toEqual([]);
  });
});
