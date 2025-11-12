/**
 * Marketplace configuration management using localStorage
 * Stores the marketplace config which defines which stores are available
 * Default comes from marketplace.config.json but users can customize it
 */

import marketplaceConfigDefault from '@/marketplace.config.json';

const MARKETPLACE_STORAGE_KEY = 'openfront_marketplace_config';

export interface MarketplaceStore {
  baseUrl: string;
  platform: string;
}

/**
 * Get the default marketplace config from the file
 */
export function getDefaultMarketplaceConfig(): MarketplaceStore[] {
  return marketplaceConfigDefault as MarketplaceStore[];
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
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate it's an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading marketplace config from localStorage:', error);
  }

  // If nothing in localStorage or error, initialize with default
  const defaultConfig = getDefaultMarketplaceConfig();
  setMarketplaceConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Set marketplace config in localStorage
 */
export function setMarketplaceConfig(config: MarketplaceStore[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(config));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('marketplaceConfigUpdated', {
      detail: { config }
    }));
  } catch (error) {
    console.error('Error saving marketplace config to localStorage:', error);
  }
}

/**
 * Reset marketplace config to default
 */
export function resetMarketplaceConfig(): void {
  const defaultConfig = getDefaultMarketplaceConfig();
  setMarketplaceConfig(defaultConfig);
}

/**
 * Check if current config matches the default
 */
export function isDefaultConfig(): boolean {
  const current = getMarketplaceConfig();
  const defaultConfig = getDefaultMarketplaceConfig();

  return JSON.stringify(current) === JSON.stringify(defaultConfig);
}
