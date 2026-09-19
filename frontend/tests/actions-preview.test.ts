import { describe, expect, it } from 'vitest';
import { submitCheckout, submitContact, submitNewsletter, validateDiscount, previewAuthError } from '@/lib/services/actions';

const payload = {
  items: [{ variantId: 'v-foyer-u', quantity: 1 }],
  shippingMethod: 'standard' as const,
  customer: {
    email: 'test@example.fr',
    firstName: 'Camille',
    lastName: 'Durand',
    address: { line1: '1 rue Test', postalCode: '75001', city: 'Paris', country: 'FR' },
  },
};

describe('services en mode preview (aucun service réel, aucun faux succès)', () => {
  it('checkout → statut preview + message honnête, aucune redirection', async () => {
    const result = await submitCheckout(payload);
    expect(result.status).toBe('preview');
    if (result.status === 'preview') {
      expect(result.message).toContain('Mode preview');
      expect(result.message).toContain('paiement sera disponible');
    }
  });

  it('code promo preview → invalide avec message clair (pas de remise simulée)', async () => {
    const r = await validateDiscount('WELCOME10', 5000);
    expect(r.valid).toBe(false);
    expect(r.discountCents).toBe(0);
    expect(r.message).toContain('preview');
  });

  it('newsletter preview → aucune inscription prétendue', async () => {
    const r = await submitNewsletter('a@b.fr', 'test');
    expect(r.status).toBe('preview');
    expect(r.message).toContain('n’est pas enregistrée');
  });

  it('contact preview → message non envoyé, dit explicitement', async () => {
    const r = await submitContact({ name: 'X', email: 'a@b.fr', subject: 'S', message: 'Message de test suffisamment long.' });
    expect(r.status).toBe('preview');
  });

  it('garde auth preview → erreur explicite (pas de compte simulé)', () => {
    const err = previewAuthError();
    expect(err).not.toBeNull();
    expect(err!.code).toBe('preview_mode');
  });
});
