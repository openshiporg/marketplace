import {
  getIntrospectionQuery,
  buildClientSchema,
  GraphQLSchema,
  isNonNullType,
  isListType,
} from 'graphql';

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

// Execute GraphQL query with authentication (supports both cookies and C-tokens)
export async function executeGraphQL(query: string, graphqlEndpoint: string, cookie: string, variables?: any, ctoken?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use C-token for business account auth, fallback to cookie for regular users
  if (ctoken) {
    headers['Authorization'] = `Bearer ${ctoken}`;
  } else if (cookie) {
    headers['Cookie'] = cookie;
  }

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    const compactQuery = query.replace(/\s+/g, ' ').trim();
    const vars = variables ? JSON.stringify(variables) : '{}';
    throw new Error(`GraphQL execution failed: ${JSON.stringify(result.errors)} | Query: ${compactQuery} | Vars: ${vars}`);
  }
  return result;
}

// Get GraphQL schema from introspection (supports both cookies and C-tokens)
export async function getGraphQLSchema(graphqlEndpoint: string, cookie: string, ctoken?: string): Promise<GraphQLSchema> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use C-token for business account auth, fallback to cookie for regular users
  if (ctoken) {
    headers['Authorization'] = `Bearer ${ctoken}`;
  } else if (cookie) {
    headers['Cookie'] = cookie;
  }

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL introspection failed: ${JSON.stringify(result.errors)}`);
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