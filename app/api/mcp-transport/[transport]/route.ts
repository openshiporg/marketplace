// Marketplace MCP Transport Route
// Multi-platform e-commerce marketplace with platform adapters
// Supports multiple admitted sources via a stable origin/profile-bound storeId.

import { storeTools, handleStoreTools } from '../tools/store-tools';
import { productTools, handleProductTools } from '../tools/product-tools';
import { cartTools, handleCartTools } from '../tools/cart-tools';
import { regionTools, handleRegionTools } from '../tools/region-tools';
import { parseStoreConfigs } from '../types/store-config';
import { MarketplaceSourceSelectionError } from '@/lib/source-identity';
import {
  MCP_TRANSPORT_REQUEST_MAX_BYTES,
  parseBoundedStringMap,
  readJsonBodyBounded,
  validateJsonSchema,
  type JsonSchemaLike,
  RequestBodyTooLargeError,
} from '@/lib/request-budgets';

class InvalidTransportInputError extends Error {}

function parseTransportStringMap(header: string): Record<string, string> {
  if (!header) return {};
  if (header.length > 32 * 1024) throw new InvalidTransportInputError();
  try {
    return parseBoundedStringMap(JSON.parse(header));
  } catch {
    throw new InvalidTransportInputError();
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  // Track if any CRUD operations occurred during this request
  const dataHasChanged = { value: false };

  try {
    await params;

    // Extract cookie from request
    const cookie = request.headers.get('cookie') || '';

    // Extract token from Authorization header if present (supports both business ctoken and user session token)
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.length > 4_104 || /[\r\n]/.test(authHeader)) throw new InvalidTransportInputError();
    let ctoken: string | undefined;
    if (/^Bearer\s+/i.test(authHeader)) {
      ctoken = authHeader.replace(/^Bearer\s+/i, '');
    }

    // Extract source-scoped cart IDs and guest-cart proofs. These maps remain
    // separate so a proof can only be selected by the requested stable storeId.
    const cartIdsHeader = request.headers.get('x-cart-ids') || '';
    const cartIds = parseTransportStringMap(cartIdsHeader);

    const cartProofsHeader = request.headers.get('x-cart-proofs') || '';
    const cartProofs = parseTransportStringMap(cartProofsHeader);

    // Extract marketplace config from custom header
    const marketplaceConfigHeader = request.headers.get('x-marketplace-config') || '';
    let customMarketplaceConfig: any[] | undefined;
    if (marketplaceConfigHeader) {
      if (marketplaceConfigHeader.length > 64 * 1024) throw new InvalidTransportInputError();
      try {
        const parsedConfig: unknown = JSON.parse(marketplaceConfigHeader);
        if (!Array.isArray(parsedConfig) || parsedConfig.length > 20) throw new InvalidTransportInputError();
        customMarketplaceConfig = parsedConfig;
      } catch (error) {
        if (error instanceof InvalidTransportInputError) throw error;
        throw new InvalidTransportInputError();
      }
    }

    // Bound parsing before JSON allocation; direct MCP callers do not inherit AI/UI schemas.
    const body = await readJsonBodyBounded<Record<string, any>>(
      request,
      MCP_TRANSPORT_REQUEST_MAX_BYTES,
    );
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.method !== 'string') {
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle the request based on method
    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false }
          },
          serverInfo: {
            name: 'openfront-marketplace-mcp-server',
            version: '1.0.0'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (body.method === 'notifications/initialized') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {}
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (body.method === 'tools/list') {
      // Combine all tools from different modules (commerce-specific only)
      const allTools = [
        ...storeTools,
        ...productTools,
        ...cartTools,
        ...regionTools
      ];

      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: allTools }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (body.method === 'tools/call') {
      // Handle tool call. Validate against the same schema exposed by tools/list
      // before any source lookup or mutation.
      const params = body.params;
      const name = params && typeof params.name === 'string' ? params.name : '';
      const args = params?.arguments === undefined ? {} : params.arguments;
      const allTools = [...storeTools, ...productTools, ...cartTools, ...regionTools];
      const schemaTool = allTools.find(tool => tool.name === name);

      if (!schemaTool || !args || typeof args !== 'object' || Array.isArray(args)) {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32602, message: 'Invalid tool request', data: { code: 'INVALID_TOOL_ARGUMENTS' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const validation = validateJsonSchema(args, schemaTool.inputSchema as JsonSchemaLike);
      if (!validation.valid) {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: {
          code: -32602,
          message: `Invalid arguments for ${name}`,
          // Name the failing argument paths (never their values) so callers can see what was rejected.
          data: {
            code: 'INVALID_TOOL_ARGUMENTS',
            issues: validation.issues.slice(0, 10).map(issue => ({ path: issue.path.slice(0, 160), reason: issue.reason })),
          },
        } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        let result;

        // Route to appropriate tool handler (commerce-specific only)
        if (storeTools.some(tool => tool.name === name)) {
          result = await handleStoreTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else if (productTools.some(tool => tool.name === name)) {
          result = await handleProductTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else if (cartTools.some(tool => tool.name === name)) {
          result = await handleCartTools(
            name,
            args,
            cookie,
            dataHasChanged,
            ctoken,
            cartIds,
            cartProofs,
            customMarketplaceConfig,
          );
        } else if (regionTools.some(tool => tool.name === name)) {
          result = await handleRegionTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else {
          throw new Error('Unknown tool');
        }

        // Add data change header if needed
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (dataHasChanged.value) {
          headers['X-Data-Changed'] = 'true';
        }

        // Always wrap tool handler output in a proper JSON-RPC response with the original request id
        const rpcResponse = {
          jsonrpc: '2.0',
          id: body.id,
          // Handlers may return a full envelope ({ jsonrpc, result }) or just the inner result.
          // Normalize to the expected shape here.
          result: (result && typeof result === 'object' && 'result' in result) ? (result as any).result : result
        };

        return new Response(JSON.stringify(rpcResponse), {
          status: 200,
          headers,
        });

      } catch (error) {
        // Log only bounded operation identity; tool arguments can contain
        // credentials, addresses, cart proofs, payment references, and cart IDs.
        console.error('[Marketplace MCP tool failed]', {
          tool: name,
          storeId: typeof args?.storeId === 'string' ? args.storeId.slice(0, 160) : undefined,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        // Never return a source exception or argument echo through MCP/model output.
        const sourceConfigError = error instanceof MarketplaceSourceSelectionError ? error : null;
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: sourceConfigError ? -32602 : -32603,
            message: sourceConfigError ? 'Marketplace source configuration is stale or invalid' : 'Tool request failed',
            data: { code: sourceConfigError?.code ?? 'SOURCE_REQUEST_FAILED' }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

    } else {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: 'Method not found' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    const oversized = error instanceof RequestBodyTooLargeError;
    const invalidInput = error instanceof InvalidTransportInputError || error instanceof SyntaxError;
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: oversized || invalidInput ? -32600 : -32603,
        message: oversized ? 'Request body too large' : invalidInput ? 'Invalid request' : 'Internal error',
        data: { code: oversized ? 'REQUEST_TOO_LARGE' : invalidInput ? 'INVALID_REQUEST' : 'INTERNAL_ERROR' }
      }
    }), {
      status: oversized ? 413 : invalidInput ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  const { transport } = await params;

  const stores = parseStoreConfigs();

  return new Response(JSON.stringify({
    message: 'Openfront Marketplace MCP Server is running',
    transport,
    availableStores: stores.length,
    stores: stores.map((s) => ({
      id: s.id,
      platform: s.platform,
      storeId: s.id,
      baseUrl: s.baseUrl
    }))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}