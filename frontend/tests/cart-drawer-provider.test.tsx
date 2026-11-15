import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartProvider, useCart } from '@/hooks/use-cart';
import { CartDrawer } from '@/components/layout/CartDrawer';

function Controls() {
  const cart = useCart();
  return <>
    <button onClick={() => cart.replaceCart([{ variantId: 'qa', productSlug: 'qa', name: 'QA',
      variantTitle: 'QA', priceCents: 100, quantity: 1, imageUrl: null, maxQuantity: 5 }])}>Préparer</button>
    <button onClick={cart.openDrawer}>Ouvrir</button>
    <output aria-label="Quantité totale">{cart.count}</output>
  </>;
}
afterEach(() => { cleanup(); window.localStorage.clear(); document.body.style.overflow = ''; });

describe('CartDrawer with the real CartProvider', () => {
  it('keeps quantity focus and the scroll lock across item updates, then restores the trigger and prior overflow', () => {
    window.localStorage.clear();
    document.body.style.overflow = 'clip';
    render(<CartProvider><Controls /><CartDrawer /></CartProvider>);
    // Mounting a closed provider must not reset the page scroll style.
    expect(document.body.style.overflow).toBe('clip');
    fireEvent.click(screen.getByRole('button', { name: 'Préparer' }));
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe('hidden');
    const increase = screen.getByRole('button', { name: 'Augmenter la quantité' });
    increase.focus();
    fireEvent.click(increase);
    expect(screen.getByRole('status', { name: 'Quantité totale' })).toHaveTextContent('2');
    expect(increase).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(increase);
    expect(screen.getByRole('status', { name: 'Quantité totale' })).toHaveTextContent('3');
    expect(increase).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('clip');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
