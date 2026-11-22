import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CartDrawer } from '@/components/layout/CartDrawer';

const state = vi.hoisted(() => ({ open: false, close: vi.fn() }));
vi.mock('@/hooks/use-cart', () => ({ useCart: () => ({ items: [], ready: true,
  drawerOpen: state.open, closeDrawer: state.close, updateQuantity: vi.fn(), removeItem: vi.fn(), subtotalCents: 0 }) }));
afterEach(() => { cleanup(); state.open = false; state.close.mockClear(); document.body.style.overflow = ''; });

describe('CartDrawer modal keyboard behavior', () => {
  it('keeps the closed panel inert and hidden from assistive technology', () => {
    render(<CartDrawer />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('dialog', { hidden: true }).parentElement).toHaveAttribute('inert');
  });
  it('focuses the panel, cycles Tab and prevents focus escaping to the page', () => {
    state.open = true;
    render(<><button>Background</button><CartDrawer /></>);
    const panel = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: 'Fermer le panier' });
    const last = screen.getByRole('link', { name: 'Voir la collection' });
    expect(panel).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
    screen.getByRole('button', { name: 'Background' }).focus();
    expect(panel).toHaveFocus();
  });
  it('handles Escape and restores focus and the prior scroll style on closing', () => {
    document.body.style.overflow = 'clip';
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    state.open = true;
    const view = render(<CartDrawer />);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(state.close).toHaveBeenCalledOnce();
    state.open = false;
    view.rerender(<CartDrawer />);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('clip');
    trigger.remove();
  });
  it('restores scrolling if unmounted while open', () => {
    state.open = true;
    document.body.style.overflow = 'auto';
    const view = render(<CartDrawer />);
    view.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
