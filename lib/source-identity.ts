export type SourcePlatform = 'openfront' | 'openfront-restaurant' | 'shopify' | 'bigcommerce' | 'woocommerce';

export interface SourceIdentityInput {
  baseUrl: string;
  platform: SourcePlatform;
}

export type SourceDirectoryCandidate = SourceIdentityInput & {
  id?: string;
  name?: string;
  storeName?: string;
};

export type AdmittedSourceDirectoryEntry = SourceIdentityInput & {
  id: string;
  name?: string;
  storeName?: string;
};

export class MarketplaceSourceSelectionError extends Error {
  readonly code = 'MARKETPLACE_CONFIG_MISMATCH';

  constructor() {
    super('Marketplace source configuration is stale, duplicated, or not admitted');
    this.name = 'MarketplaceSourceSelectionError';
  }
}

/**
 * The source identity is derived from the admitted HTTPS origin/profile rather
 * than its position in a customer-owned directory. It is safe to persist as a
 * local cart/session key because changing either input changes the identity.
 */
export function normalizeSourceBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  if (url.protocol !== 'https:') {
    throw new Error('Marketplace sources must use HTTPS');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Marketplace source URLs cannot include credentials, query strings, or fragments');
  }

  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

/** Previous IDs are recognized only to migrate config records for an exact URL/platform match. */
export function legacySourceIdFor({ baseUrl, platform }: SourceIdentityInput): string {
  const normalizedBaseUrl = normalizeSourceBaseUrl(baseUrl);
  return `source-${platform}-${encodeURIComponent(normalizedBaseUrl).replace(/%/g, '_')}`;
}

/**
 * Versioned, injective source identity. Literal underscores are escaped before
 * percent escapes so a URL path slash cannot collide with a literal `_2F`.
 * The v2 namespace also prevents old credential-map keys from being reused by
 * a different endpoint after a source-directory revision.
 */
export function sourceIdFor({ baseUrl, platform }: SourceIdentityInput): string {
  const normalizedBaseUrl = normalizeSourceBaseUrl(baseUrl);
  const encoded = encodeURIComponent(normalizedBaseUrl)
    .replace(/_/g, '_5F')
    .replace(/%/g, '_');
  return `source-v2-${platform}-${encoded}`;
}

export function hasMatchingSourceIdentity(
  expected: SourceIdentityInput,
  candidate: SourceDirectoryCandidate,
): boolean {
  try {
    const expectedBaseUrl = normalizeSourceBaseUrl(expected.baseUrl);
    return candidate.platform === expected.platform
      && normalizeSourceBaseUrl(candidate.baseUrl) === expectedBaseUrl
      && (!candidate.id
        || candidate.id === sourceIdFor({ baseUrl: expectedBaseUrl, platform: expected.platform })
        || candidate.id === legacySourceIdFor({ baseUrl: expectedBaseUrl, platform: expected.platform }));
  } catch {
    return false;
  }
}

/** Select/reorder/relabel only exact admitted identities; stale or duplicate selections fail closed. */
export function selectAdmittedSourceDirectory<T extends AdmittedSourceDirectoryEntry>(
  admittedStores: readonly T[],
  customerDirectory?: readonly SourceDirectoryCandidate[],
): T[] {
  const admittedIds = new Set<string>();
  for (const store of admittedStores) {
    let canonicalId: string;
    try {
      canonicalId = sourceIdFor(store);
    } catch {
      throw new MarketplaceSourceSelectionError();
    }
    if (store.id !== canonicalId || admittedIds.has(store.id)) {
      throw new MarketplaceSourceSelectionError();
    }
    admittedIds.add(store.id);
  }

  if (customerDirectory === undefined) return [...admittedStores];
  if (!Array.isArray(customerDirectory)) throw new MarketplaceSourceSelectionError();

  const selectedIds = new Set<string>();
  const selected: T[] = [];
  for (const candidate of customerDirectory) {
    if (!candidate || typeof candidate !== 'object'
      || typeof candidate.baseUrl !== 'string'
      || typeof candidate.platform !== 'string'
      || (candidate.id !== undefined && typeof candidate.id !== 'string')
      || (candidate.name !== undefined && typeof candidate.name !== 'string')
      || (candidate.storeName !== undefined && typeof candidate.storeName !== 'string')) {
      throw new MarketplaceSourceSelectionError();
    }

    const admitted = admittedStores.find(store => hasMatchingSourceIdentity(store, candidate));
    if (!admitted || selectedIds.has(admitted.id)) throw new MarketplaceSourceSelectionError();
    selectedIds.add(admitted.id);

    const name = candidate.name || candidate.storeName;
    selected.push({
      ...admitted,
      ...(name ? { name, storeName: name } : {}),
    });
  }
  return selected;
}
