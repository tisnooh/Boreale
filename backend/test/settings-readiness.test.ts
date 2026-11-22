import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('../src/repositories/misc.js', () => ({ settingsRepo: state }));
import { HOMEPAGE_DEFAULTS, settingsService } from '../src/services/settings.js';

beforeEach(() => { state.get.mockReset(); });
describe('honest homepage defaults', () => {
  it('uses the five priorities without stock, freight, test or bundle promises when no admin content exists', async () => {
    state.get.mockResolvedValue(null);
    const homepage = await settingsService.getHomepage();
    expect(homepage.featuredProductSlugs).toEqual(['gants-tactiles-contact', 'chaussons-fourres-refuge', 'chauffe-mains-reutilisables-braise', 'chaussettes-polaires-nuage', 'semelles-thermiques-isolantes']);
    expect(homepage.bundleSlugs).toEqual([]);
    expect(homepage.announcementBar).toBeNull();
    expect(JSON.stringify(homepage)).not.toMatch(/69 €|30 jours|24-48|expédiés depuis la France|sélectionnés et testés/);
  });
  it('returns the same safe fallback when the settings repository is unavailable', async () => {
    state.get.mockRejectedValue(new Error('unavailable'));
    expect(await settingsService.getHomepage()).toEqual(HOMEPAGE_DEFAULTS);
  });
  it('preserves explicit administrator content instead of overwriting stored decisions', async () => {
    state.get.mockResolvedValue({ hero: { title: 'Texte validé' }, featuredProductSlugs: ['confirmed-reference'] });
    const result = await settingsService.getHomepage();
    expect(result.hero.title).toBe('Texte validé');
    expect(result.featuredProductSlugs).toEqual(['confirmed-reference']);
  });
});
