export const MARKETPLACE_PROFILE_STORAGE_KEY = 'openfront_marketplace_profile';
export const MARKETPLACE_PROFILE_UPDATED_EVENT = 'marketplaceProfileUpdated';

export type MarketplaceTheme = 'clay' | 'forest' | 'midnight';

export interface MarketplaceProfile {
  version: 1;
  owner: 'platform';
  name: string;
  tagline: string;
  theme: MarketplaceTheme;
}

export const DEFAULT_MARKETPLACE_PROFILE: MarketplaceProfile = {
  version: 1,
  owner: 'platform',
  name: 'Common Goods',
  tagline: 'Useful things from independent makers and neighborhood shops.',
  theme: 'clay',
};

const THEMES = new Set<MarketplaceTheme>(['clay', 'forest', 'midnight']);

export function parseMarketplaceProfile(value: unknown): MarketplaceProfile | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  if (profile.version !== 1 || profile.owner !== 'platform') return null;
  if (typeof profile.name !== 'string' || typeof profile.tagline !== 'string' || typeof profile.theme !== 'string') return null;
  const name = profile.name.trim().replace(/\s+/g, ' ');
  const tagline = profile.tagline.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 48 || !tagline || tagline.length > 140 || !THEMES.has(profile.theme as MarketplaceTheme)) return null;
  return { version: 1, owner: 'platform', name, tagline, theme: profile.theme as MarketplaceTheme };
}

export function getMarketplaceProfile(): MarketplaceProfile {
  if (typeof window === 'undefined') return DEFAULT_MARKETPLACE_PROFILE;
  try {
    const parsed = parseMarketplaceProfile(JSON.parse(localStorage.getItem(MARKETPLACE_PROFILE_STORAGE_KEY) || 'null'));
    return parsed || DEFAULT_MARKETPLACE_PROFILE;
  } catch {
    return DEFAULT_MARKETPLACE_PROFILE;
  }
}

export function saveMarketplaceProfile(input: MarketplaceProfile): MarketplaceProfile {
  const profile = parseMarketplaceProfile(input);
  if (!profile) throw new Error('Marketplace identity or theme is invalid.');
  if (typeof window !== 'undefined') {
    localStorage.setItem(MARKETPLACE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(MARKETPLACE_PROFILE_UPDATED_EVENT, { detail: profile }));
    document.documentElement.dataset.marketplaceTheme = profile.theme;
  }
  return profile;
}
