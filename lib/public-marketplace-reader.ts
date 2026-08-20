import { LOCAL_MARKETPLACE_CATALOG } from './local-marketplace-catalog.ts';

export const PUBLIC_READER_MAX_LIMIT = 24;
export type PublicReaderState = 'ready' | 'unconfigured' | 'offline';

export type PublicCatalogQuery = { query?: string; merchantId?: string; collectionId?: string; limit?: number };

function boundedText(value: unknown, name: string) {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const result = value.trim().replace(/\s+/g, ' ');
  if (result.length > 80) throw new Error(`${name} is too long`);
  return result || undefined;
}

export function readPublicMarketplace(input: PublicCatalogQuery = {}) {
  const query = boundedText(input.query, 'query')?.toLowerCase();
  const merchantId = boundedText(input.merchantId, 'merchantId');
  const collectionId = boundedText(input.collectionId, 'collectionId');
  const limit = Math.max(1, Math.min(Number.isFinite(input.limit) ? Math.trunc(input.limit!) : 12, PUBLIC_READER_MAX_LIMIT));
  const merchants = new Map(LOCAL_MARKETPLACE_CATALOG.merchants.map((merchant) => [merchant.id, merchant]));
  const listings = LOCAL_MARKETPLACE_CATALOG.listings.filter((listing) => {
    if (merchantId && listing.merchantId !== merchantId) return false;
    if (collectionId && !listing.collectionIds.includes(collectionId as never)) return false;
    if (!query) return true;
    const merchant = merchants.get(listing.merchantId);
    return `${listing.title} ${listing.description} ${listing.kind} ${merchant?.name || ''}`.toLowerCase().includes(query);
  }).slice(0, limit).map((listing) => ({ ...listing, merchant: merchants.get(listing.merchantId)! }));

  return {
    state: 'ready' as const,
    source: 'bundled-mock' as const,
    liveCommerce: false,
    disclosure: LOCAL_MARKETPLACE_CATALOG.disclosure,
    observedAt: null,
    merchants: LOCAL_MARKETPLACE_CATALOG.merchants,
    collections: LOCAL_MARKETPLACE_CATALOG.collections,
    listings,
  };
}

export function publicReaderUnavailable(state: Exclude<PublicReaderState, 'ready'>, detail?: string) {
  return {
    state,
    source: null,
    liveCommerce: false,
    disclosure: state === 'unconfigured'
      ? 'No public catalog source is configured for this deployment.'
      : 'The configured public catalog source is currently unreachable. No cached result is presented as live.',
    detail,
    merchants: [], collections: [], listings: [],
  };
}
