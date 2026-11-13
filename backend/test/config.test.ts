import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config.js';

describe('configuration production', () => {
  it('conserve le démarrage local sans services', () => expect(loadEnv({}).NODE_ENV).toBe('development'));
  it.each([undefined, '', 'court', 'dev-only-insecure-secret-change-me'])('rejette JWT absent ou faible %s', (JWT_SECRET) => {
    expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET, CRON_SECRET: 'c'.repeat(32) })).toThrow('JWT_SECRET');
  });
  it('rejette cron absent et secrets réutilisés', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'j'.repeat(32) })).toThrow('CRON_SECRET');
    expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'j'.repeat(32), CRON_SECRET: 'j'.repeat(32) })).toThrow('distinct');
  });
  it('accepte deux secrets distincts configurés', () => {
    expect(loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'j'.repeat(32), CRON_SECRET: 'c'.repeat(32) }).NODE_ENV).toBe('production');
  });
});
