import {
  getIntrospectionQuery,
  buildClientSchema,
  GraphQLSchema,
  isNonNullType,
  isListType,
} from 'graphql';
import { createTrustedFetch } from '@/lib/remote-endpoint';
import { parseStoreConfigs } from '../types/store-config';

const SOURCE_REQUEST_TIMEOUT_MS = 8_000;
const admittedSourceOrigins = parseStoreConfigs().map(store => new URL(store.baseUrl).origin);
const fetchTrustedSource = createTrustedFetch({
  allowedOrigins: admittedSourceOrigins,
  developmentPrivateOrigins: admittedSourceOrigins.filter(origin => {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith('.local') || hostname.endsWith('.localhost');
  }),
});

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
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Marketplace authentication is forwarded explicitly. Never forward the
  // Marketplace origin's cookie jar to a remote merchant source; only the
  // Restaurant adapter's source-scoped public cart cookie is allowed through.
  if (ctoken) {
    headers['Authorization'] = `Bearer ${ctoken}`;
  }
  const sourceCartCookie = cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('_restaurant_cart_id='));
  if (sourceCartCookie) {
    headers.Cookie = sourceCartCookie;
  }
  if (cartProof) {
    headers['X-Openfront-Cart-Proof'] = cartProof;
  }

  const response = await fetchTrustedSource(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(SOURCE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Source GraphQL HTTP ${response.status}`);
  }

  const result = await response.json();
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

// Get GraphQL schema from introspection (supports both cookies and C-tokens)
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
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error('Source GraphQL introspection failed');
  }

  return buildClientSchema(result.data);
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