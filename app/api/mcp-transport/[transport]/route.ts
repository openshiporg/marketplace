// Marketplace MCP Transport Route
// Multi-platform e-commerce marketplace with platform adapters
// Supports multiple stores via storeId parameter (e.g., "store-1", "store-2")

import { storeTools, handleStoreTools } from '../tools/store-tools';
import { productTools, handleProductTools } from '../tools/product-tools';
import { cartTools, handleCartTools } from '../tools/cart-tools';
import { regionTools, handleRegionTools } from '../tools/region-tools';
import { parseStoreConfigs } from '../types/store-config';

export async function POST(request: Request, { params }: { params: Promise<{ transport: string }> }) {
  // Track if any CRUD operations occurred during this request
  let dataHasChanged = { value: false };

  try {
    const { transport } = await params;

    // Extract cookie from request
    const cookie = request.headers.get('cookie') || '';

    // Extract token from Authorization header if present (supports both business ctoken and user session token)
    const authHeader = request.headers.get('authorization') || '';
    let ctoken: string | undefined;
    if (/^Bearer\s+/i.test(authHeader)) {
      ctoken = authHeader.replace(/^Bearer\s+/i, '');
    }

    // Extract cart IDs from custom header
    const cartIdsHeader = request.headers.get('x-cart-ids') || '';
    let cartIds: Record<string, string> = {};
    if (cartIdsHeader) {
      try {
        cartIds = JSON.parse(cartIdsHeader);
      } catch (error) {
        console.error('Failed to parse cart IDs header:', error);
      }
    }

    // Extract marketplace config from custom header
    const marketplaceConfigHeader = request.headers.get('x-marketplace-config') || '';
    let customMarketplaceConfig: any[] | undefined;
    if (marketplaceConfigHeader) {
      try {
        customMarketplaceConfig = JSON.parse(marketplaceConfigHeader);
      } catch (error) {
        console.error('Failed to parse marketplace config header:', error);
      }
    }

    // Parse the JSON-RPC request
    const body = await request.json();

    // Handle the request based on method
    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true }
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
      // Handle tool call
      const { name, arguments: args } = body.params;

      try {
        let result;

        // Route to appropriate tool handler (commerce-specific only)
        if (storeTools.some(tool => tool.name === name)) {
          result = await handleStoreTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else if (productTools.some(tool => tool.name === name)) {
          result = await handleProductTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else if (cartTools.some(tool => tool.name === name)) {
          result = await handleCartTools(name, args, cookie, dataHasChanged, ctoken, cartIds, customMarketplaceConfig);
        } else if (regionTools.some(tool => tool.name === name)) {
          result = await handleRegionTools(name, args, cookie, ctoken, customMarketplaceConfig);
        } else {
          throw new Error(`Tool ${name} not found`);
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
        // Return proper JSON-RPC error response to satisfy client Zod schemas
        const message = (error instanceof Error) ? error.message : String(error);
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32603,
            message: `Error executing ${name}: ${message}`,
            data: message
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
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error)
      }
    }), {
      status: 500,
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