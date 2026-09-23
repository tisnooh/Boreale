import { describe, expect, it } from 'vitest';
import { getSeasonFromPath, DEFAULT_SEASON, homepageSettingsKey } from '@/lib/season/config';
import { matchesShopSeason } from '@/lib/season/types';
import { getCatalogSource } from '@/lib/catalog/source';

describe('config saisonnière', () => {
  it('saison par défaut = winter (boutique historique préservée)', () => {
    expect(DEFAULT_SEASON).toBe('winter');
  });

  it('détection de saison par URL', () => {
    expect(getSeasonFromPath('/')).toBe('winter');
    expect(getSeasonFromPath('/hiver')).toBe('winter');
    expect(getSeasonFromPath('/collections/plaid-sherpa-nid')).toBe('winter');
    expect(getSeasonFromPath('/ete')).toBe('summer');
    expect(getSeasonFromPath('/ete/anything')).toBe('summer');
    expect(getSeasonFromPath(null)).toBe('winter');
  });

  it('clés de settings mutualisées par saison', () => {
    expect(homepageSettingsKey('winter')).toBe('homepage');
    expect(homepageSettingsKey('summer')).toBe('homepage-summer');
  });

  it('all-season visible dans les deux univers', () => {
    expect(matchesShopSeason('all-season', 'winter')).toBe(true);
    expect(matchesShopSeason('all-season', 'summer')).toBe(true);
    expect(matchesShopSeason('summer', 'winter')).toBe(false);
    expect(matchesShopSeason('winter', 'summer')).toBe(false);
  });
});

describe('source catalogue saisonnière (preview)', () => {
  const source = getCatalogSource();

  it('6 univers été, 4 univers hiver', async () => {
    const summer = await source.categories('summer');
    const winter = await source.categories('winter');
    expect(summer).toHaveLength(6);
    expect(winter).toHaveLength(4);
    expect(summer.every((c) => c.season === 'summer')).toBe(true);
  });

  it('sélection été vide et honnête en attendant le sourcing', async () => {
    const products = await source.products('summer');
    expect(products).toHaveLength(0);
    const winter = await source.products('winter');
    expect(winter.length).toBeGreaterThan(5);
  });

  it('homepage été distincte de la homepage hiver', async () => {
    const summer = await source.homepage('summer');
    const winter = await source.homepage('winter');
    expect(summer.hero.title).toContain('été');
    expect(winter.hero.title).toContain('hiver');
    expect(summer.faq.length).toBeGreaterThan(0);
  });
});
