import { readFileSync } from 'fs';
import { join } from 'path';
import {
  normalizeSourceBaseUrl,
  selectAdmittedSourceDirectory,
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

  const seenEndpoints = new Set<string>();
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
      if (seenEndpoints.has(endpoint)) {
        console.warn('[marketplace] ignored a duplicate source endpoint to preserve adapter/auth scope.');
        return [];
      }
      seenEndpoints.add(endpoint);
      return [{ platform, baseUrl, id, endpoint, ...(config.name ? { name: config.name } : {}),
        ...(config.storeName ? { storeName: config.storeName } : {}),
      }];
    } catch {
      console.warn('[marketplace] ignored an invalid or non-HTTPS configured source.');
      return [];
    }
  });

  // No header means an external/default client receives the bundled directory.
  // An explicitly supplied array—including []—is the customer's authoritative
  // selection. Invalid/stale identities and duplicate selections fail closed
  // instead of silently becoming a partial directory or a successful zero count.
  return selectAdmittedSourceDirectory(admittedStores, customerDirectory);
}

export function findStoreByEndpoint(endpoint: string): ParsedStore | undefined {
  const stores = parseStoreConfigs();
  return stores.find(s => s.endpoint === endpoint);
}

