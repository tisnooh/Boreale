import { describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { PRIORITY_PRODUCTS } from '@/lib/catalog/priority-products';
import { productJsonLd } from '@/lib/seo';

const cart = vi.hoisted(() => ({ addItem: vi.fn() }));
vi.mock('@/hooks/use-cart', () => ({ useCart: () => cart }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('priority draft product boundary', () => {
  it('shows pending content instead of a free price, false scarcity or unrelated photo', () => {
    render(<ProductCard product={PRIORITY_PRODUCTS[0]!} />);
    expect(screen.getByText('Prix à confirmer')).toBeInTheDocument();
    expect(screen.getByText('En cours de préparation')).toBeInTheDocument();
    expect(screen.getByText('Visuel en préparation')).toBeInTheDocument();
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
    expect(screen.queryByText('Rupture de stock')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    cleanup();
  });
  it('blocks purchasing even if a draft accidentally contains a priced in-stock variant', () => {
    const poisoned = { ...PRIORITY_PRODUCTS[0]!, variants: [{ id: 'unexpected', sku: 'unexpected', title: 'Test', options: {}, priceCents: 1990, compareAtPriceCents: null, inStock: true, quantity: 99, lowStock: false }] };
    render(<ProductPurchase product={poisoned} />);
    expect(screen.getByText(/n’est pas proposé à la vente/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /panier/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/19,90/)).not.toBeInTheDocument();
    expect(cart.addItem).not.toHaveBeenCalled();
    cleanup();
  });
  it('does not emit an offer or zero euro aggregate price for a draft', () => {
    const data = productJsonLd(PRIORITY_PRODUCTS[0]!, null);
    expect(data).not.toHaveProperty('offers');
    expect(data).not.toHaveProperty('sku');
  });
});
