import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '@/app/checkout/page';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  submitCheckout: vi.fn(),
  validateDiscount: vi.fn(),
  getMe: vi.fn(),
  authLoading: false,
  user: null as { id: string; email: string; firstName: null; lastName: null } | null,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading }) }));
vi.mock('@/lib/config', () => ({ isPreview: () => false, isLaunch: () => false }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  api: { get: mocks.getMe, post: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/use-cart', () => ({
  useCart: () => ({
    ready: true,
    subtotalCents: 2000,
    clear: mocks.clear,
    items: [{ variantId: 'v1', quantity: 1, name: 'Article test', variantTitle: 'Bleu', priceCents: 2000, imageUrl: null }],
  }),
}));
vi.mock('@/lib/services/actions', () => ({
  submitCheckout: mocks.submitCheckout,
  validateDiscount: mocks.validateDiscount,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.authLoading = false;
  mocks.getMe.mockResolvedValue({ data: { id: 'customer-authenticated' } });
  mocks.validateDiscount.mockResolvedValue({ valid: true, discountCents: 100, message: 'Valide' });
});

describe('checkout : promotion et conservation du panier', () => {
  it('attend la résolution de session initiale avant toute commande invitée', () => {
    mocks.authLoading = true;
    const { container } = render(<CheckoutPage />);
    fireEvent.submit(container.querySelector('form')!);
    expect(mocks.submitCheckout).not.toHaveBeenCalled();
    expect(mocks.getMe).not.toHaveBeenCalled();
  });
  it('vérifie la session du client connecté avant une seule création checkout', async () => {
    mocks.user = { id: 'customer-authenticated', email: 'client@example.fr', firstName: null, lastName: null };
    mocks.submitCheckout.mockResolvedValue({ status: 'preview', message: 'Test isolé' });
    const { container } = render(<CheckoutPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(mocks.submitCheckout).toHaveBeenCalledOnce());
    expect(mocks.getMe).toHaveBeenCalledWith('/api/me');
    expect(mocks.getMe.mock.invocationCallOrder[0]).toBeLessThan(mocks.submitCheckout.mock.invocationCallOrder[0]!);
  });

  it.each(['expired', 'changed'])('ne transforme pas une session %s en commande invitée', async (state) => {
    mocks.user = { id: 'customer-authenticated', email: 'client@example.fr', firstName: null, lastName: null };
    if (state === 'expired') mocks.getMe.mockRejectedValueOnce(new Error('Session expirée'));
    else mocks.getMe.mockResolvedValueOnce({ data: { id: 'different-customer' } });
    const { container } = render(<CheckoutPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mocks.submitCheckout).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it('ne contient qu’un formulaire, et appliquer une promotion ne lance pas le paiement', async () => {
    const { container } = render(<CheckoutPage />);
    expect(container.querySelectorAll('form')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Code promo'), { target: { value: 'TEST' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(mocks.validateDiscount).toHaveBeenCalledWith('TEST', 2000));
    expect(mocks.submitCheckout).not.toHaveBeenCalled();
  });

  it('Entrée dans le code promo reste une action de promotion', async () => {
    render(<CheckoutPage />);
    const input = screen.getByLabelText('Code promo');
    fireEvent.change(input, { target: { value: 'TEST' } });
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(mocks.validateDiscount).toHaveBeenCalledOnce());
    expect(mocks.submitCheckout).not.toHaveBeenCalled();
  });

  it('conserve le panier lors de la redirection vers le paiement', async () => {
    // Une URL locale avec fragment permet de vérifier la navigation dans jsdom sans service externe.
    mocks.submitCheckout.mockResolvedValue({ status: 'redirect', url: `${window.location.href.split('#')[0]}#payment-test` });
    const { container } = render(<CheckoutPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(window.location.hash).toBe('#payment-test'));
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(screen.getByText('Article test')).toBeInTheDocument();
  });

  it('conserve le panier si la tentative de paiement échoue', async () => {
    mocks.submitCheckout.mockRejectedValue(new Error('Paiement refusé'));
    const { container } = render(<CheckoutPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(screen.getByText('Article test')).toBeInTheDocument();
  });
});
