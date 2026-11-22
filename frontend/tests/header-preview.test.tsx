import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';
import { PreviewBanner } from '@/components/layout/PreviewBanner';
import { CartProvider } from '@/hooks/use-cart';
import { AuthProvider } from '@/hooks/use-auth';

// Navigation tests do not exercise authentication or leave a request in flight.
vi.mock('@/hooks/use-auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderHeader() {
  return render(
    <CartProvider>
      <AuthProvider>
        <Header announcement={null} />
      </AuthProvider>
    </CartProvider>
  );
}

describe('Header — navigation mobile', () => {
  it('ouvre le menu au clic puis le ferme avec ESC', () => {
    renderHeader();
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button).toHaveAttribute('aria-controls', 'menu-mobile');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    const nav = document.getElementById('menu-mobile');
    expect(nav).not.toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('menu-mobile')).toBeNull();
  });

  it('tous les liens de navigation pointent vers des routes réelles', () => {
    renderHeader();
    const links = screen.getAllByRole('link');
    for (const l of links) {
      const href = l.getAttribute('href') ?? '';
      expect(href.startsWith('/')).toBe(true);
      expect(href).not.toBe('#');
    }
  });

  it('réserve le décalage du bandeau et recalcule la hauteur au redimensionnement', () => {
    const { container, unmount } = renderHeader();
    const header = container.querySelector('header')!;
    let top = 56;
    vi.spyOn(header, 'getBoundingClientRect').mockImplementation(() => ({ top }) as DOMRect);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(header.style.getPropertyValue('--header-offset')).toBe('56px');
    top = 0;
    fireEvent.resize(window);
    expect(header.style.getPropertyValue('--header-offset')).toBe('0px');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(header.style.getPropertyValue('--header-offset')).toBe('');
    unmount();
  });
});

describe('PreviewBanner', () => {
  it('affiche le mode preview par défaut (env non défini = preview)', () => {
    render(<PreviewBanner />);
    expect(screen.getByRole('status').textContent).toContain('Mode preview');
  });
});
