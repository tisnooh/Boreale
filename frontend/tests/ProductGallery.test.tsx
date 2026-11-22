import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProductGallery } from '@/components/product/ProductGallery';

afterEach(cleanup);

function swiping(target: Element, from: [number, number], to: [number, number]) {
  for (const [type, [clientX, clientY]] of [['pointerdown', from], ['pointerup', to]] as const) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerType: 'touch', isPrimary: true, pointerId: 1, clientX, clientY });
    fireEvent(target, event);
  }
}

describe('ProductGallery', () => {
  const imageUrl = '/product-main.jpg';
  const images = [imageUrl, '/product-detail.jpg', '/product-third.jpg', '/product-fourth.jpg', '/product-fifth.jpg'];

  it('selects the third photo and exposes every distinct image', () => {
    render(<ProductGallery name="Nuage" imageUrl={imageUrl} images={images} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    const third = screen.getByRole('button', { name: 'Afficher le visuel 3' });
    fireEvent.click(third);
    expect(third).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Nuage — visuel 3 sur 5' }).getAttribute('src')).toContain('product-third.jpg');
  });

  it('swipes through the third photo without capturing vertical page scrolling', () => {
    render(<ProductGallery name="Nuage" imageUrl={imageUrl} images={images} />);
    const first = screen.getByRole('img', { name: 'Nuage — visuel 1 sur 5' });
    swiping(first, [170, 100], [110, 220]);
    expect(first).toBeInTheDocument();
    swiping(first, [170, 100], [40, 110]);
    swiping(screen.getByRole('img', { name: 'Nuage — visuel 2 sur 5' }), [170, 100], [40, 110]);
    expect(screen.getByRole('img', { name: 'Nuage — visuel 3 sur 5' })).toBeInTheDocument();
  });

  it('keeps an honest placeholder for a product without photos', () => {
    render(<ProductGallery name="Nuage" imageUrl={null} images={[]} awaitingPhotos />);
    expect(screen.getByText('Photographies du modèle en préparation')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
