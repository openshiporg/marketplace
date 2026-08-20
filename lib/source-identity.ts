export type SourcePlatform = 'openfront' | 'openfront-restaurant' | 'shopify' | 'bigcommerce' | 'woocommerce';

export interface SourceIdentityInput {
  baseUrl: string;
  platform: SourcePlatform;
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

export function sourceIdFor({ baseUrl, platform }: SourceIdentityInput): string {
  const normalizedBaseUrl = normalizeSourceBaseUrl(baseUrl);
  return `source-${platform}-${encodeURIComponent(normalizedBaseUrl).replace(/%/g, '_')}`;
}

export function hasMatchingSourceIdentity(
  expected: SourceIdentityInput,
  candidate: SourceIdentityInput & { id?: string }
): boolean {
  try {
    return candidate.platform === expected.platform
      && normalizeSourceBaseUrl(candidate.baseUrl) === normalizeSourceBaseUrl(expected.baseUrl)
      && (!candidate.id || candidate.id === sourceIdFor(expected));
  } catch {
    return false;
  }
}
