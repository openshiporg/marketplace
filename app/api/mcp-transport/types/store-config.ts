import { readFileSync } from 'fs';
import { join } from 'path';

export type PlatformType = 'openfront' | 'shopify' | 'bigcommerce' | 'woocommerce';

export interface StoreConfig {
  platform: PlatformType;
  baseUrl: string; // e.g., https://store.example.com
}

export interface ParsedStore extends StoreConfig {
  id: string; // e.g., store-1
  endpoint: string; // baseUrl + getApiPath(platform)
}

const PLATFORM_API_PATHS: Record<PlatformType, string> = {
  openfront: '/api/graphql',
  shopify: '/admin/api/2024-01/graphql.json',
  bigcommerce: '/graphql',
  woocommerce: '/graphql',
};

export function getApiPath(platform: PlatformType): string {
  return PLATFORM_API_PATHS[platform];
}

export function parseStoreConfigs(): ParsedStore[] {
  const configPath = join(process.cwd(), 'marketplace.config.json');
  let configs: StoreConfig[] = [];
  try {
    const file = readFileSync(configPath, 'utf-8');
    configs = JSON.parse(file);
  } catch (e) {
    console.warn('[marketplace] marketplace.config.json not found or invalid. No stores configured.');
    configs = [];
  }

  return configs.map((cfg, index) => ({
    ...cfg,
    id: `store-${index + 1}`,
    endpoint: `${cfg.baseUrl}${getApiPath(cfg.platform)}`,
  }));
}

export function findStoreByEndpoint(endpoint: string): ParsedStore | undefined {
  const stores = parseStoreConfigs();
  return stores.find(s => s.endpoint === endpoint);
}

