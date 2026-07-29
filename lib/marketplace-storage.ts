/**
 * Marketplace configuration management using localStorage
 * Stores the marketplace config which defines which stores are available
 * Default comes from marketplace.config.json but users can customize it
 */

import marketplaceConfigDefault from '@/marketplace.config.json';

export const MARKETPLACE_STORAGE_KEY = 'openfront_marketplace_config';
export const MARKETPLACE_CONFIG_UPDATED_EVENT = 'marketplaceConfigUpdated';

export interface MarketplaceStore {
  baseUrl: string;
  platform: string;
  name?: string;
  storeName?: string;
}

function normalizeMarketplaceConfig(value: unknown): MarketplaceStore[] | null {
  if (!Array.isArray(value)) return null;

  const stores: MarketplaceStore[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;

    const store = item as Record<string, unknown>;
    if (typeof store.baseUrl !== 'string' || typeof store.platform !== 'string') {
      return null;
    }

    const baseUrl = store.baseUrl.trim();
    const platform = store.platform.trim();
    if (!baseUrl || !platform) return null;

    const rawName = typeof store.name === 'string'
      ? store.name
      : typeof store.storeName === 'string'
        ? store.storeName
        : '';
    const name = rawName.trim();

    stores.push({
      baseUrl,
      platform,
      ...(name ? { name } : {}),
    });
  }

  return stores;
}

/**
 * Get the default marketplace config from the file
 */
export function getDefaultMarketplaceConfig(): MarketplaceStore[] {
  return (marketplaceConfigDefault as MarketplaceStore[]).map(store => ({ ...store }));
}

/**
 * Get marketplace config from localStorage, or default if not set
 */
export function getMarketplaceConfig(): MarketplaceStore[] {
  if (typeof window === 'undefined') {
    return getDefaultMarketplaceConfig();
  }

  try {
    const stored = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (stored !== null) {
      const config = normalizeMarketplaceConfig(JSON.parse(stored));
      if (config) {
        const defaultConfig = getDefaultMarketplaceConfig();
        if (JSON.stringify(config) === JSON.stringify(defaultConfig)) {
          // Older versions copied the defaults into localStorage on first load.
          // Remove that legacy copy so the bundled JSON remains the source.
          localStorage.removeItem(MARKETPLACE_STORAGE_KEY);
          return defaultConfig;
        }
        return config;
      }
    }
  } catch (error) {
    console.error('Error reading marketplace config from localStorage:', error);
  }

  // The bundled JSON is only a fallback. Do not copy it into localStorage until
  // the user actually changes their store list.
  return getDefaultMarketplaceConfig();
}

/**
 * Set marketplace config in localStorage
 */
export function setMarketplaceConfig(config: MarketplaceStore[]): void {
  if (typeof window === 'undefined') return;

  try {
    const normalizedConfig = normalizeMarketplaceConfig(config);
    if (!normalizedConfig) {
      throw new Error('Marketplace config must be an array of valid stores');
    }

    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(normalizedConfig));

    // The browser's storage event only fires in other tabs, so notify this tab too.
    window.dispatchEvent(new CustomEvent(MARKETPLACE_CONFIG_UPDATED_EVENT, {
      detail: { config: normalizedConfig }
    }));
  } catch (error) {
    console.error('Error saving marketplace config to localStorage:', error);
  }
}

/**
 * Reset marketplace config to default
 */
export function resetMarketplaceConfig(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(MARKETPLACE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(MARKETPLACE_CONFIG_UPDATED_EVENT, {
      detail: { config: getDefaultMarketplaceConfig() }
    }));
  } catch (error) {
    console.error('Error resetting marketplace config:', error);
  }
}

/**
 * Check if current config matches the default
 */
export function isDefaultConfig(): boolean {
  const current = getMarketplaceConfig();
  const defaultConfig = getDefaultMarketplaceConfig();

  return JSON.stringify(current) === JSON.stringify(defaultConfig);
}
