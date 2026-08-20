/**
 * Marketplace configuration management using localStorage
 * Stores the marketplace config which defines which stores are available
 * Default comes from marketplace.config.json but users can customize it
 */

import marketplaceConfigDefault from '@/marketplace.config.json';
import { normalizeSourceBaseUrl, sourceIdFor, type SourcePlatform } from '@/lib/source-identity';

export const MARKETPLACE_STORAGE_KEY = 'openfront_marketplace_config';
export const MARKETPLACE_CONFIG_UPDATED_EVENT = 'marketplaceConfigUpdated';

export interface MarketplaceStore {
  id: string;
  baseUrl: string;
  platform: SourcePlatform;
  name?: string;
  storeName?: string;
}

interface StoredMarketplaceDirectory {
  version: 1;
  managed: true;
  stores: MarketplaceStore[];
}

const SOURCE_PLATFORMS = new Set<SourcePlatform>([
  'openfront',
  'openfront-restaurant',
  'shopify',
  'bigcommerce',
  'woocommerce',
]);

// Exact historical bundled defaults are not user overrides. Recognizing them
// lets existing browsers receive newly bundled stores without merging into a
// genuinely customized directory.
const LEGACY_DEFAULT_CONFIGS: Array<Array<Omit<MarketplaceStore, 'id'>>> = [
  [
    { baseUrl: 'https://nimbus-gallery.openship.org', platform: 'openfront' },
    { baseUrl: 'https://impossible-tees.openship.org', platform: 'openfront' },
  ],
  [
    { baseUrl: 'https://nimbus-gallery.openship.org', platform: 'openfront' },
    { baseUrl: 'https://impossible-tees.openship.org', platform: 'openfront' },
    { baseUrl: 'https://craft-burgers.openship.org', platform: 'openfront-restaurant' },
  ],
  [
    { baseUrl: 'https://nimbus-gallery.openship.org', platform: 'openfront' },
    { baseUrl: 'https://impossible-tees.openship.org', platform: 'openfront' },
    { baseUrl: 'https://craft-burgers.openship.org', platform: 'openfront-restaurant' },
    { baseUrl: 'https://restaurant-video-fresh.local', platform: 'openfront-restaurant' },
  ],
];

const LEGACY_SOURCE_REPLACEMENTS: Record<string, Pick<MarketplaceStore, 'baseUrl' | 'platform'>> = {
  'source-openfront-restaurant-https_3A_2F_2Frestaurant-video-fresh.local': {
    baseUrl: 'https://restaurant.local',
    platform: 'openfront-restaurant',
  },
};

function normalizeMarketplaceConfig(value: unknown): MarketplaceStore[] | null {
  if (!Array.isArray(value)) return null;

  const stores: MarketplaceStore[] = [];
  const sourceIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;

    const store = item as Record<string, unknown>;
    if (typeof store.baseUrl !== 'string' || typeof store.platform !== 'string') {
      return null;
    }

    const platform = store.platform.trim() as SourcePlatform;
    if (!SOURCE_PLATFORMS.has(platform)) return null;

    let baseUrl: string;
    try {
      baseUrl = normalizeSourceBaseUrl(store.baseUrl);
    } catch {
      return null;
    }
    if (!platform) return null;

    const id = sourceIdFor({ baseUrl, platform });
    if (typeof store.id === 'string' && store.id !== id) return null;
    if (sourceIds.has(id)) return null;
    sourceIds.add(id);

    const rawName = typeof store.name === 'string'
      ? store.name
      : typeof store.storeName === 'string'
        ? store.storeName
        : '';
    const name = rawName.trim();

    stores.push({
      id,
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
  const config = normalizeMarketplaceConfig(marketplaceConfigDefault);
  if (!config) throw new Error('Bundled marketplace configuration is invalid');
  return config;
}

function sameDirectory(left: MarketplaceStore[], right: MarketplaceStore[]): boolean {
  return left.length === right.length && left.every((store, index) =>
    store.id === right[index]?.id &&
    store.baseUrl === right[index]?.baseUrl &&
    store.platform === right[index]?.platform
  );
}

function selectAdmittedStores(config: MarketplaceStore[]): MarketplaceStore[] {
  const admittedById = new Map(getDefaultMarketplaceConfig().map(store => [store.id, store]));
  const selectedIds = new Set<string>();
  return config.flatMap(store => {
    const replacement = LEGACY_SOURCE_REPLACEMENTS[store.id];
    const candidate = replacement
      ? {
          ...store,
          ...replacement,
          id: sourceIdFor(replacement),
        }
      : store;
    const admitted = admittedById.get(candidate.id);
    if (
      !admitted ||
      selectedIds.has(candidate.id) ||
      admitted.baseUrl !== candidate.baseUrl ||
      admitted.platform !== candidate.platform
    ) {
      return [];
    }
    selectedIds.add(candidate.id);
    const name = candidate.name || candidate.storeName;
    return [{
      ...admitted,
      ...(name ? { name } : {}),
    }];
  });
}

function managedDirectory(stores: MarketplaceStore[]): StoredMarketplaceDirectory {
  return { version: 1, managed: true, stores };
}

function isManagedDirectory(value: unknown): value is StoredMarketplaceDirectory {
  if (!value || typeof value !== 'object') return false;
  const directory = value as Partial<StoredMarketplaceDirectory>;
  return directory.version === 1 && directory.managed === true && Array.isArray(directory.stores);
}

/**
 * Get marketplace config from localStorage, or default if not set.
 *
 * Legacy versions stored a bare array, which made a deliberate deletion that
 * happened to match an old bundled default indistinguishable from migration
 * data. User edits now use an explicit managed envelope so empty directories
 * and historical-default-shaped directories remain authoritative.
 */
export function getMarketplaceConfig(): MarketplaceStore[] {
  const defaultConfig = getDefaultMarketplaceConfig();
  if (typeof window === 'undefined') return defaultConfig;

  try {
    const stored = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (stored === null) return defaultConfig;

    const parsed: unknown = JSON.parse(stored);
    const managed = isManagedDirectory(parsed);
    const config = normalizeMarketplaceConfig(managed ? parsed.stores : parsed);
    if (!config) return defaultConfig;

    const admittedConfig = selectAdmittedStores(config);
    if (managed) {
      const normalizedStored = JSON.stringify(managedDirectory(admittedConfig));
      if (stored !== normalizedStored) {
        localStorage.setItem(MARKETPLACE_STORAGE_KEY, normalizedStored);
      }
      return admittedConfig;
    }

    const isBundledDefault = sameDirectory(config, defaultConfig) ||
      LEGACY_DEFAULT_CONFIGS.some(legacy => {
        const normalizedLegacy = normalizeMarketplaceConfig(legacy);
        return normalizedLegacy ? sameDirectory(config, normalizedLegacy) : false;
      });
    if (isBundledDefault) {
      // Bare historical defaults were copied automatically by older versions.
      localStorage.removeItem(MARKETPLACE_STORAGE_KEY);
      return defaultConfig;
    }

    // Preserve genuine legacy custom directories, but migrate them to the
    // unambiguous managed format and discard endpoints not admitted by this server.
    localStorage.setItem(
      MARKETPLACE_STORAGE_KEY,
      JSON.stringify(managedDirectory(admittedConfig))
    );
    return admittedConfig;
  } catch (error) {
    console.error('Error reading marketplace config from localStorage:', error);
    return defaultConfig;
  }
}

/**
 * Set marketplace config in localStorage
 */
export function setMarketplaceConfig(config: MarketplaceStore[]): MarketplaceStore[] {
  if (typeof window === 'undefined') return [];

  try {
    const normalizedConfig = normalizeMarketplaceConfig(config);
    if (!normalizedConfig) {
      throw new Error('Marketplace config must contain unique, valid store identities');
    }

    const admittedConfig = selectAdmittedStores(normalizedConfig);
    if (admittedConfig.length !== normalizedConfig.length) {
      throw new Error('A store must be admitted in marketplace.config.json before it can be connected');
    }

    localStorage.setItem(
      MARKETPLACE_STORAGE_KEY,
      JSON.stringify(managedDirectory(admittedConfig))
    );

    // The browser's storage event only fires in other tabs, so notify this tab too.
    window.dispatchEvent(new CustomEvent(MARKETPLACE_CONFIG_UPDATED_EVENT, {
      detail: { config: admittedConfig }
    }));
    return admittedConfig;
  } catch (error) {
    console.error('Error saving marketplace config to localStorage:', error);
    throw error;
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
  if (typeof window === 'undefined') return true;

  // This also migrates any legacy bare-array value before we inspect it.
  getMarketplaceConfig();
  const stored = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
  if (stored === null) return true;

  try {
    return !isManagedDirectory(JSON.parse(stored));
  } catch {
    return true;
  }
}
