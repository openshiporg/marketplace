export type MarketplaceDiscoveryToolName = 'discoverProducts' | 'discoverRestaurantMenus';

export function discoveryToolForUserText(value: string): MarketplaceDiscoveryToolName | null {
  const text = value.toLowerCase();
  if (!text || /\b(cart|checkout|pay|payment|shipping|delivery|pickup|address|contact|phone|email|quantity|remove|log ?in|sign ?in)\b/.test(text)) {
    return null;
  }
  if (/\b(restaurant|restaurants|menu|menus|food|dish|dishes|meal|dinner|lunch|breakfast|takeout|take-out|burger|burgers|pizza)\b/.test(text)) {
    return 'discoverRestaurantMenus';
  }
  if (/\b(product|products|shop|shopping|buy|t[ -]?shirts?|shirts?|hoodies?|clothing|scarves?|socks?|beanies?|sweaters?|joggers?|laptops?)\b/.test(text)) {
    return 'discoverProducts';
  }
  return null;
}

export type MarketplaceDiscoveryInput = {
  query?: string;
  location?: string;
  countryCode?: string;
  storeIds?: string[];
  limit?: number;
};

export type MarketplaceDiscoveryRequest = {
  prompt: string;
  toolName: MarketplaceDiscoveryToolName;
  input: MarketplaceDiscoveryInput;
};

export type ParsedMarketplaceDiscoveryInput = {
  query?: string;
  location?: string;
  countryCode?: string;
  storeIds?: string[];
  limit: number;
};

const MAX_DISCOVERY_TEXT_LENGTH = 80;
const MAX_DISCOVERY_STORES = 20;
const MAX_DISCOVERY_RESULTS = 24;

const SEARCH_FILLER_WORDS = new Set([
  'a',
  'all',
  'an',
  'and',
  'available',
  'buy',
  'can',
  'find',
  'for',
  'from',
  'get',
  'give',
  'i',
  'item',
  'items',
  'looking',
  'me',
  'need',
  'order',
  'please',
  'product',
  'products',
  'show',
  'some',
  'the',
  'to',
  'want',
  'with',
]);

function boundedOptionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return undefined;
  if (normalized.length > MAX_DISCOVERY_TEXT_LENGTH) {
    throw new Error(`${field} is too long`);
  }
  return normalized;
}

export function parseMarketplaceDiscoveryInput(value: unknown): ParsedMarketplaceDiscoveryInput {
  const input = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const query = boundedOptionalText(input.query, 'query');
  const location = boundedOptionalText(input.location, 'location');

  let countryCode: string | undefined;
  if (input.countryCode !== undefined && input.countryCode !== null && input.countryCode !== '') {
    if (typeof input.countryCode !== 'string' || !/^[a-z]{2}$/i.test(input.countryCode.trim())) {
      throw new Error('countryCode must be a two-letter country code');
    }
    countryCode = input.countryCode.trim().toLowerCase();
  }

  let storeIds: string[] | undefined;
  if (input.storeIds !== undefined) {
    if (!Array.isArray(input.storeIds) || input.storeIds.length > MAX_DISCOVERY_STORES) {
      throw new Error('storeIds must be a bounded array');
    }
    storeIds = Array.from(new Set(input.storeIds.map((storeId) => {
      if (typeof storeId !== 'string' || !storeId.trim()) {
        throw new Error('storeIds must contain non-empty strings');
      }
      return storeId.trim();
    })));
  }

  const requestedLimit = typeof input.limit === 'number' && Number.isFinite(input.limit)
    ? Math.trunc(input.limit)
    : 10;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_DISCOVERY_RESULTS));

  return {
    ...(query ? { query } : {}),
    ...(location ? { location } : {}),
    ...(countryCode ? { countryCode } : {}),
    ...(storeIds ? { storeIds } : {}),
    limit,
  };
}

export function discoveryPlatformForTool(toolName: MarketplaceDiscoveryToolName) {
  return toolName === 'discoverRestaurantMenus'
    ? 'openfront-restaurant'
    : 'openfront';
}

export function selectDiscoveryStores<T extends { id: string; platform: string }>(
  stores: T[],
  toolName: MarketplaceDiscoveryToolName,
  input: ParsedMarketplaceDiscoveryInput
): T[] {
  const requestedIds = input.storeIds ? new Set(input.storeIds) : null;
  const platform = discoveryPlatformForTool(toolName);
  return stores.filter((store) =>
    store.platform === platform && (!requestedIds || requestedIds.has(store.id))
  );
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchTermVariants(term: string): string[] {
  const variants = new Set([term]);
  if (term.length > 4 && term.endsWith('ies')) {
    variants.add(term.slice(0, -1));
    variants.add(`${term.slice(0, -3)}y`);
  }
  if (term.length > 4 && term.endsWith('ves')) {
    variants.add(`${term.slice(0, -3)}f`);
    variants.add(`${term.slice(0, -3)}fe`);
  }
  if (term.length > 3 && term.endsWith('s') && !term.endsWith('ss')) {
    variants.add(term.slice(0, -1));
  }
  return [...variants];
}

function meaningfulSearchTerms(query: string): string[] {
  return Array.from(new Set(
    normalizeSearchText(query)
      .split(' ')
      .filter((term) => term.length > 1 && !SEARCH_FILLER_WORDS.has(term))
  ));
}

export function productMatchesDiscoveryQuery(product: unknown, query?: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  let serialized = '';
  try {
    serialized = JSON.stringify(product);
  } catch {
    serialized = String(product ?? '');
  }
  const haystack = normalizeSearchText(serialized);
  const compactHaystack = haystack.replace(/\s+/g, '');
  const terms = meaningfulSearchTerms(query);

  if (!terms.length) return haystack.includes(normalizedQuery);
  return terms.every((term) => searchTermVariants(term).some((variant) =>
    haystack.includes(variant) || compactHaystack.includes(variant.replace(/\s+/g, ''))
  ));
}

export function storeMatchesDiscoveryLocation(
  storeInfo: { address?: unknown; countryCode?: unknown } | null | undefined,
  countries: Array<{ code?: unknown; name?: unknown }>,
  location?: string
): boolean {
  if (!location) return true;
  const target = normalizeSearchText([
    storeInfo?.address,
    storeInfo?.countryCode,
    ...countries.flatMap((country) => [country.code, country.name]),
  ].filter(Boolean).join(' '));
  if (!target) return false;

  const normalizedLocation = normalizeSearchText(location);
  const terms = meaningfulSearchTerms(location);
  return target.includes(normalizedLocation) || (
    terms.length > 0 && terms.every((term) => target.includes(term))
  );
}
