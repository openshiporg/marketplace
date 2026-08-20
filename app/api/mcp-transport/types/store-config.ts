import { readFileSync } from 'fs';
import { join } from 'path';
import {
  hasMatchingSourceIdentity,
  normalizeSourceBaseUrl,
  sourceIdFor,
  type SourcePlatform,
} from '@/lib/source-identity';

export type PlatformType = SourcePlatform;

export interface StoreConfig {
  id?: string;
  platform: PlatformType;
  baseUrl: string; // e.g., https://store.example.com
  name?: string; // User-defined store name
  storeName?: string; // Alternative field for store name
}

export interface ParsedStore extends StoreConfig {
  id: string;
  endpoint: string; // baseUrl + getApiPath(platform)
}

const PLATFORM_API_PATHS: Record<PlatformType, string> = {
  openfront: '/api/graphql',
  'openfront-restaurant': '/api/graphql',
  shopify: '/admin/api/2024-01/graphql.json',
  bigcommerce: '/graphql',
  woocommerce: '/graphql',
};

export function getApiPath(platform: PlatformType): string {
  return PLATFORM_API_PATHS[platform];
}

export function parseStoreConfigs(customerDirectory?: StoreConfig[]): ParsedStore[] {
  let admittedConfigs: StoreConfig[] = [];

  // The bundled directory is the server-side admission boundary. A browser may
  // select, order, and relabel admitted sources, but it cannot add arbitrary
  // server fetch destinations or replace an endpoint through a request header.
  try {
    const configPath = join(process.cwd(), 'marketplace.config.json');
    const file = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(file);
    admittedConfigs = Array.isArray(parsed) ? parsed as StoreConfig[] : [];
  } catch {
    console.warn('[marketplace] marketplace.config.json not found or invalid. No stores configured.');
  }

  const admittedStores = admittedConfigs.flatMap((config) => {
    try {
      const baseUrl = normalizeSourceBaseUrl(config.baseUrl);
      const platform = config.platform;
      const id = sourceIdFor({ baseUrl, platform });
      if (config.id && config.id !== id) {
        console.warn(`[marketplace] ignored source with an identity that does not match its endpoint: ${config.id}`);
        return [];
      }

      const pathname = getApiPath(platform).replace(/^\//, '');
      const endpoint = new URL(pathname, `${baseUrl}/`).toString();
      return [{ ...config, baseUrl, id, endpoint }];
    } catch {
      console.warn('[marketplace] ignored an invalid or non-HTTPS configured source.');
      return [];
    }
  });

  // No header means an external/default client receives the bundled directory.
  // An explicitly supplied array—including []—is the customer's authoritative
  // selection and must be reflected in counts, discovery, carts, and chat.
  if (customerDirectory === undefined) return admittedStores;
  if (!Array.isArray(customerDirectory)) return [];

  const selectedIds = new Set<string>();
  return customerDirectory.flatMap(candidate => {
    const admitted = admittedStores.find(store =>
      hasMatchingSourceIdentity(store, candidate)
    );
    if (!admitted || selectedIds.has(admitted.id)) return [];
    selectedIds.add(admitted.id);

    const name = candidate.name || candidate.storeName;
    return [{
      ...admitted,
      ...(name ? { name, storeName: name } : {}),
    }];
  });
}

export function findStoreByEndpoint(endpoint: string): ParsedStore | undefined {
  const stores = parseStoreConfigs();
  return stores.find(s => s.endpoint === endpoint);
}

