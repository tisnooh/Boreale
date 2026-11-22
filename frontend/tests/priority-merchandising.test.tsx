import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Cover } from '@/components/home/Cover';
import { Folio } from '@/components/home/Folio';
import { HOMEPAGE_FALLBACK } from '@/lib/homepage-fallback';
import { SUMMER_HOMEPAGE } from '@/lib/season/content-summer';
import TermsPage from '@/app/legal/terms/page';
import ReturnsPage from '@/app/legal/returns/page';

describe('priority merchandising remains truthful while models are unverified', () => {
  it('keeps the five priorities ordered and avoids unqualified packs or delivery promises', () => {
    expect(HOMEPAGE_FALLBACK.featuredProductSlugs).toEqual([
      'gants-tactiles-contact', 'chaussons-fourres-refuge', 'chauffe-mains-reutilisables-braise',
      'chaussettes-polaires-nuage', 'semelles-thermiques-isolantes',
    ]);
    expect(HOMEPAGE_FALLBACK.bundleSlugs).toEqual([]);
    expect(JSON.stringify(HOMEPAGE_FALLBACK)).not.toMatch(/69 €|30 jours|24-48|expédiés depuis la France|sélectionnés et testés/);
  });
  it('cover does not present former supplier product illustrations as priority photos', () => {
    const { container } = render(<Cover hero={HOMEPAGE_FALLBACK.hero} />);
    expect(screen.getAllByText('Visuel en préparation')).toHaveLength(8);
    expect(container.querySelectorAll('figure img')).toHaveLength(0);
    expect(screen.queryByText(/Sentinelle|Nid|Foyer|14 pièces|48 h expédition|30 j retours/)).toBeNull();
    expect(screen.getByRole('link', { name: /Questions/ })).toHaveAttribute('href', '#faq');
  });
  it('folio states preparation rather than fictitious inventory and delivery service', () => {
    render(<Folio />);
    expect(screen.getByText('5 essentiels · sélection en préparation')).toBeInTheDocument();
    expect(screen.queryByText(/14 pièces|Expédition France/)).toBeNull();
  });
});

describe('commercial content before supplier validation', () => {
  it('does not promise shipping origin, lead times or commercial returns in the summer fallback', () => {
    expect(JSON.stringify(SUMMER_HOMEPAGE)).not.toMatch(/depuis la France|24-48|48-72|30 jours|Apple Pay|Google Pay/i);
  });

  it('states the statutory withdrawal period and avoids unconfirmed contractual promises', () => {
    const terms = render(<TermsPage />);
    expect(terms.container.textContent).toContain('14 jours à compter de la réception');
    expect(terms.container.textContent).not.toMatch(/depuis la France|24-48|48-72|porté commercialement|consumers\/odr/i);

    const returns = render(<ReturnsPage />);
    expect(returns.container.textContent).toContain('preuve d’expédition');
    expect(returns.container.textContent).not.toMatch(/30 jours|24-48|sous 5 jours/i);
  });
});
