import type { PlatformAdapter } from './types';
import type { ParsedStore } from '../types/store-config';

// Lazy-loaded adapters. Add new entries as platforms are implemented (Shopify, BigCommerce, WooCommerce).
const platformAdapters: Record<string, () => Promise<{ default: PlatformAdapter }>> = {
  openfront: () => import('./openfront'),
};

const adapterCache = new Map<string, PlatformAdapter>();

export async function getPlatformAdapter(store: ParsedStore): Promise<PlatformAdapter> {
  if (adapterCache.has(store.platform)) {
    return adapterCache.get(store.platform)!;
  }

  const loader = platformAdapters[store.platform];
  if (!loader) {
    throw new Error(`Unsupported platform: ${store.platform}`);
  }

  const mod = await loader().catch(() => null);
  if (!mod || !mod.default) {
    throw new Error(`Adapter not implemented for platform: ${store.platform}`);
  }

  const adapter = mod.default;
  adapterCache.set(store.platform, adapter);
  return adapter;
}

