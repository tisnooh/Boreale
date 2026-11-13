import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '@/app/checkout/page';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  submitCheckout: vi.fn(),
  validateDiscount: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: null }) }));
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
  mocks.validateDiscount.mockResolvedValue({ valid: true, discountCents: 100, message: 'Valide' });
});

describe('checkout : promotion et conservation du panier', () => {
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
