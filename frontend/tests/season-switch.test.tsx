import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeasonSwitch } from '@/components/layout/SeasonSwitch';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

let mockPathname = '/';

describe('SeasonSwitch (accessibilité & navigation)', () => {
  it('hiver actif sur "/" : état perceptible + aria-current', () => {
    mockPathname = '/';
    render(<SeasonSwitch />);
    const winter = screen.getByRole('link', { name: 'Hiver' });
    const summer = screen.getByRole('link', { name: 'Été' });
    expect(winter).toHaveAttribute('aria-current', 'page');
    expect(summer).not.toHaveAttribute('aria-current');
    expect(winter).toHaveAttribute('href', '/');
    expect(summer).toHaveAttribute('href', '/ete');
  });

  it('été actif sur "/ete"', () => {
    mockPathname = '/ete';
    render(<SeasonSwitch />);
    expect(screen.getByRole('link', { name: 'Été' })).toHaveAttribute('aria-current', 'page');
  });

  it('le switch est un nav labellisé (lecteurs d’écran)', () => {
    mockPathname = '/';
    render(<SeasonSwitch />);
    expect(screen.getByRole('navigation', { name: /univers saisonnier/i })).toBeInTheDocument();
  });
});
