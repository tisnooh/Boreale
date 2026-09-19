import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductDTO } from '@/lib/types';

const product: ProductDTO = {
  id: 'p1',
  slug: 'plaid-sherpa-nid',
  name: 'Plaid sherpa « Nid »',
  subtitle: 'Double face : polaire lisse, sherpa nuage.',
  description: 'Le plaid XL double face.',
  longDescription: null,
  type: 'product',
  isFeatured: true,
  imageUrl: '/products/plaid-sherpa-nid.svg',
  images: [],
  badge: null,
  tags: ['plaid'],
  bundleItems: [],
  seoTitle: null,
  seoDescription: null,
  priceCents: 5990,
  variantCount: 2,
  inStock: true,
  categories: [{ slug: 'maison-cocooning', name: 'Maison / Cocooning' }],
};

describe('ProductCard', () => {
  it('affiche nom, catégorie, prix formaté et lien produit', () => {
    render(<ProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/plaid-sherpa-nid');
    expect(screen.getByText('Plaid sherpa « Nid »')).toBeInTheDocument();
    expect(screen.getByText('Maison / Cocooning')).toBeInTheDocument();
    expect(screen.getByText(/59,90/)).toBeInTheDocument();
    expect(screen.getByText('et plus')).toBeInTheDocument(); // 2 variantes
  });

  it('affiche la rupture quand inStock=false', () => {
    render(<ProductCard product={{ ...product, inStock: false }} />);
    expect(screen.getByText('Rupture de stock')).toBeInTheDocument();
  });

  it('badge affiché quand présent ; badge Pack pour un bundle sans badge', () => {
    render(<ProductCard product={{ ...product, badge: 'Coup de cœur' }} />);
    expect(screen.getByText('Coup de cœur')).toBeInTheDocument();
    render(<ProductCard product={{ ...product, type: 'bundle', badge: null }} />);
    expect(screen.getAllByText('Pack').length).toBeGreaterThan(0);
  });
});
