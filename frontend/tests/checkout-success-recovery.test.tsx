import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('session_id=cs_test_fixture') }));
vi.mock('@/lib/api', async original => ({ ...await original<typeof import('@/lib/api')>(), api: { get: state.get } }));
import CheckoutSuccessPage from '@/app/checkout/success/page';
import { beginCheckoutAttempt, bindCheckoutAttempt } from '@/lib/checkout-attempt';
const payload = { items: [{ variantId: 'variant-test', quantity: 1 }], shippingMethod: 'standard' as const,
  customer: { email: 'buyer@example.fr', firstName: 'Camille', lastName: 'Durand',
    address: { line1: '12 rue de Test', postalCode: '75001', city: 'Paris', country: 'FR' } } };
beforeEach(() => { state.get.mockReset(); sessionStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
async function pendingAttempt() { const attempt = await beginCheckoutAttempt(payload, null); bindCheckoutAttempt(attempt, 'BOR-TEST'); }
const session = { paymentStatus: 'paid', amountTotal: 4200, customerEmail: 'buyer@example.fr', orderNumber: 'BOR-TEST' };

describe('success page requires payment and recorded order', () => {
  it('does not confirm the order or clear recovery from a paid Stripe session alone', async () => {
    await pendingAttempt(); state.get.mockResolvedValue({ data: session });
    render(<CheckoutSuccessPage />);
    expect(await screen.findByText('Paiement reçu, confirmation de commande en cours')).toBeInTheDocument();
    expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).not.toBeNull();
    expect(screen.queryByText(/email de confirmation vient de partir/)).not.toBeInTheDocument();
  });
  it('clears matching recovery after durable paid order proof and describes a preparation incident honestly', async () => {
    await pendingAttempt(); state.get.mockResolvedValue({ data: { ...session, paidOrderRecorded: true, fulfillmentStatus: 'blocked' } });
    render(<CheckoutSuccessPage />);
    expect(await screen.findByText('Merci, votre commande est enregistrée !')).toBeInTheDocument();
    expect(screen.getByText(/nécessite une vérification avant préparation/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun délai d’expédition n’est confirmé/)).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).toBeNull());
  });
  it('does not clear another order attempt from a valid but unrelated confirmation', async () => {
    await pendingAttempt(); state.get.mockResolvedValue({ data: { ...session, orderNumber: 'BOR-OTHER', paidOrderRecorded: true } });
    render(<CheckoutSuccessPage />);
    expect(await screen.findByText('Merci, votre commande est enregistrée !')).toBeInTheDocument();
    expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).not.toBeNull();
  });
  it('keeps an unpaid session pending even when the recorded flag is inconsistent', async () => {
    await pendingAttempt(); state.get.mockResolvedValue({ data: { ...session, paymentStatus: 'unpaid', paidOrderRecorded: true } });
    render(<CheckoutSuccessPage />);
    expect(await screen.findByText('Paiement en cours de traitement')).toBeInTheDocument();
    expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).not.toBeNull();
  });
  it('does not promise order recording or an email after a verification failure', async () => {
    await pendingAttempt(); state.get.mockRejectedValue(new Error('Unavailable'));
    render(<CheckoutSuccessPage />);
    expect(await screen.findByText(/Impossible de vérifier le paiement et l’enregistrement/)).toBeInTheDocument();
    expect(screen.getByText(/ne relancez pas un paiement/)).toBeInTheDocument();
    expect(screen.queryByText(/vous recevrez un email de confirmation/)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('boreale.checkout-attempt.v1')).not.toBeNull();
  });
});
