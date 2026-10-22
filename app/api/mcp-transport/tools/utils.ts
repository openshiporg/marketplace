import {
  getIntrospectionQuery,
  buildClientSchema,
  GraphQLSchema,
  isNonNullType,
  isListType,
} from 'graphql';
import { createTrustedFetch } from '@/lib/remote-endpoint';
import {
  cancelResponseBody,
  readJsonResponseBounded,
  SOURCE_GRAPHQL_RESPONSE_MAX_BYTES,
  SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES,
} from '@/lib/request-budgets';
import { parseStoreConfigs } from '../types/store-config';

const SOURCE_REQUEST_TIMEOUT_MS = 8_000;
const admittedSources = parseStoreConfigs();
const admittedSourceOrigins = admittedSources.map(store => new URL(store.baseUrl).origin);
const admittedSourceByEndpoint = new Map(admittedSources.map(store => [store.endpoint, store]));
const fetchTrustedSource = createTrustedFetch({
  allowedOrigins: admittedSourceOrigins,
  developmentPrivateOrigins: admittedSourceOrigins.filter(origin => {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith('.local') || hostname.endsWith('.localhost');
  }),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Get simple type name for display
export function getSimpleTypeName(type: any): string {
  if (isNonNullType(type)) {
    return getSimpleTypeName(type.ofType);
  }
  if (isListType(type)) {
    return `[${getSimpleTypeName(type.ofType)}]`;
  }
  return type.name || type.toString();
}

export class SourceGraphQLError extends Error {
  readonly sourceMessages: string[];
  readonly sourceCodes: string[];

  constructor(errors: Array<{ message?: unknown; extensions?: { code?: unknown } }>) {
    super('Source GraphQL request failed');
    this.name = 'SourceGraphQLError';
    this.sourceMessages = errors
      .map(error => typeof error?.message === 'string' ? error.message : '')
      .filter(Boolean);
    this.sourceCodes = errors
      .map(error => typeof error?.extensions?.code === 'string' ? error.extensions.code : '')
      .filter(Boolean);
  }
}

// Execute GraphQL with source authentication and an optional source-issued
// guest-cart proof. Proofs are source-scoped and must never be reused across
// Marketplace stores.
export async function executeGraphQL(
  query: string,
  graphqlEndpoint: string,
  cookie: string,
  variables?: any,
  ctoken?: string,
  cartProof?: string,
  signal?: AbortSignal,
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Preserve the existing source-scoped Restaurant cart cookie contract.
  // The Marketplace cookie jar itself is never forwarded to a merchant.
  const sourceCartCookie = cookie.split(';').map(part => part.trim())
    .find(part => part.startsWith('_restaurant_cart_id='));
  if (sourceCartCookie) headers.Cookie = sourceCartCookie;

  // A caller bearer is selected by the source-specific tool handler.
  if (ctoken) {
    if (ctoken.length > 4_096 || /[\r\n]/.test(ctoken)) throw new Error('Invalid source credential');
    headers.Authorization = `Bearer ${ctoken}`;
  }
  if (cartProof) {
    if (cartProof.length > 4_096 || /[\r\n]/.test(cartProof)) throw new Error('Invalid source cart proof');
    const source = admittedSourceByEndpoint.get(graphqlEndpoint);
    if (source?.platform === 'openfront-restaurant') {
      headers['X-Restaurant-Cart-Proof'] = cartProof;
    } else if (source?.platform === 'openfront') {
      headers['X-Openfront-Cart-Proof'] = cartProof;
    } else {
      throw new Error('Cart proof cannot be sent to an unknown source contract');
    }
  }

  const perCallTimeout = AbortSignal.timeout(SOURCE_REQUEST_TIMEOUT_MS);
  const requestSignal = signal
    ? AbortSignal.any([signal, perCallTimeout])
    : perCallTimeout;
  requestSignal.throwIfAborted();

  const response = await fetchTrustedSource(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: requestSignal,
  });

  if (!response.ok) {
    await cancelResponseBody(response);
    throw new Error(`Source GraphQL HTTP ${response.status}`);
  }

  const result = await readJsonResponseBounded<unknown>(response, SOURCE_GRAPHQL_RESPONSE_MAX_BYTES);
  if (!isRecord(result)
    || (!('data' in result) && !('errors' in result))
    || (result.errors !== undefined && !Array.isArray(result.errors))) {
    throw new SyntaxError('Invalid source GraphQL response');
  }
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    // Keep detailed source diagnostics server-side without returning variables,
    // credentials, addresses, cart proofs, or payment references to the client.
    const operation = query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1] || 'anonymous';
    console.error('[Marketplace source GraphQL]', {
      origin: new URL(graphqlEndpoint).origin,
      operation,
      errorCount: result.errors.length,
      codes: result.errors
        .map((error: any) => error?.extensions?.code)
        .filter((code: unknown) => typeof code === 'string'),
    });
    throw new SourceGraphQLError(result.errors);
  }
  return result;
}

// Schema introspection has a larger but still explicit response budget.
export async function getGraphQLSchema(graphqlEndpoint: string, _cookie: string, ctoken?: string): Promise<GraphQLSchema> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ctoken) {
    headers['Authorization'] = `Bearer ${ctoken}`;
  }

  const response = await fetchTrustedSource(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: getIntrospectionQuery() }),
    signal: AbortSignal.timeout(SOURCE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    await cancelResponseBody(response);
    throw new Error(`HTTP ${response.status}`);
  }

  const result = await readJsonResponseBounded<unknown>(response, SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES);
  if (!isRecord(result)
    || !isRecord(result.data)
    || (result.errors !== undefined && !Array.isArray(result.errors))
    || (Array.isArray(result.errors) && result.errors.length > 0)
    || !('__schema' in result.data)) {
    throw new Error('Source GraphQL introspection failed');
  }

  return buildClientSchema(result.data as any);
}

// MCP UI helper function to create proper UI resources
export function createUIResource(options: {
  uri: string;
  content: { type: 'rawHtml'; htmlString: string } | { type: 'externalUrl'; iframeUrl: string };
  encoding: 'text' | 'blob';
}) {
  const { uri, content, encoding } = options;

  if (content.type === 'rawHtml') {
    return {
      type: 'resource' as const,
      resource: {
        uri,
        mimeType: 'text/html' as const,
        [encoding]: content.htmlString,
      },
    };
  } else if (content.type === 'externalUrl') {
    return {
      type: 'resource' as const,
      resource: {
        uri,
        mimeType: 'text/uri-list' as const,
        [encoding]: content.iframeUrl,
      },
    };
  }

  throw new Error(`Unsupported content type: ${(content as any).type}`);
}