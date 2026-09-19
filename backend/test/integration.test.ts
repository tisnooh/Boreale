import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * Tests d'intégration HTTP réels : on démarre la vraie app Express sur un port
 * éphémère et on la frappe en fetch. Aucun service externe requis — les
 * dépendances manquantes doivent produire des 503 honnêtes, jamais 200.
 */
const { createApp } = await import('../src/app.js');
const { resetAllRateLimits } = await import('../src/middleware/rateLimit.js');

let server: http.Server;
let base: string;

beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('HTTP integration', () => {
  it('GET /api/health → 200 + état honnête des services', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; services: Record<string, string> };
    expect(body.status).toBe('ok');
    expect(body.services.database).toBe('missing_env');
    expect(body.services.stripe).toBe('missing_env');
  });

  it('route inconnue → 404 avec enveloppe normalisée', async () => {
    const res = await fetch(`${base}/api/nexiste-pas`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('not_found');
  });

  it('validation Zod → 422 avec détails par champ', async () => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pas-un-email' }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; details: unknown[] } };
    expect(body.error.code).toBe('validation_error');
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it('GET /api/variants valide le format des ids (422) puis 503 sans DB', async () => {
    const bad = await fetch(`${base}/api/variants?ids=garbage`);
    expect(bad.status).toBe(422);
    const good = await fetch(`${base}/api/variants?ids=550e8400-e29b-41d4-a716-446655440001`);
    expect(good.status).toBe(503); // base non configurée dans l'env de test
    const body = (await good.json()) as { error: { code: string } };
    expect(body.error.code).toBe('database_not_configured');
  });

  it('webhook Stripe sans configuration → 503 (jamais de faux reçu)', async () => {
    const res = await fetch(`${base}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    expect(res.status).toBe(503);
  });

  it('rate-limit auth : 20 requêtes OK puis 429', async () => {
    // Le limiteur est un état MODULE (partagé serverless) : reset pour un cas isolé
    resetAllRateLimits();
    const localServer = http.createServer(createApp());
    await new Promise<void>((resolve) => localServer.listen(0, '127.0.0.1', resolve));
    const localBase = `http://127.0.0.1:${(localServer.address() as AddressInfo).port}`;
    try {
      const results: number[] = [];
      for (let i = 0; i < 22; i++) {
        const res = await fetch(`${localBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'x@y.fr', password: 'abcdef12' }),
        });
        results.push(res.status);
      }
      // 503 DB manquante pour les 20 premières (limite atteinte), puis 429
      expect(results.slice(0, 20).every((s) => s === 503)).toBe(true);
      expect(results[20]).toBe(429);
      expect(results[21]).toBe(429);
    } finally {
      await new Promise<void>((resolve) => localServer.close(() => resolve()));
    }
  });

  it('CORS : origine inconnue rejetée 403, localhost dev autorisé avec credentials', async () => {
    const evil = await fetch(`${base}/api/health`, { headers: { Origin: 'https://evil.example' } });
    expect(evil.status).toBe(403);
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();

    const ok = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:3000' } });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(ok.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('headers de sécurité posés', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
  });
});
