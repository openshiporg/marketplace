import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { parseStoreConfigs } from '../types/store-config';
import { getPlatformAdapter } from '../adapters';

export const storeTools: Tool[] = [
  {
    name: 'getAvailableStores',
    description: 'Get list of available stores in the marketplace. Use this first to see which stores are available, then use their endpoints for commerce operations.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

export async function handleStoreTools(name: string, args: any, cookie: string, ctoken?: string) {
  if (name === 'getAvailableStores') {
    const parsed = parseStoreConfigs();

    // Enrich each store with live store info from its platform adapter (name, logoIcon, logoColor, paymentProviders)
    const stores = await Promise.all(parsed.map(async (s) => {
      try {
        const adapter = await getPlatformAdapter(s);
        const info = await adapter.getStoreInfo({ store: s, cookie, ctoken });
        console.log('[getAvailableStores] Store info for', s.id, ':', info);
        return {
          id: s.id,
          storeId: s.id,
          name: info?.name || new URL(s.baseUrl).hostname,
          platform: s.platform,
          baseUrl: s.baseUrl,
          logoIcon: info?.logoIcon || null,
          logoColor: info?.logoColor || null,
          paymentProviders: info?.paymentProviders || [],
        } as const;
      } catch (e) {
        // Fallback if adapter or store query fails
        console.error('[getAvailableStores] Error fetching store info for', s.id, ':', e);
        return {
          id: s.id,
          storeId: s.id,
          name: new URL(s.baseUrl).hostname,
          platform: s.platform,
          baseUrl: s.baseUrl,
          logoIcon: null,
          logoColor: null,
          paymentProviders: [] as any[],
        } as const;
      }
    }));

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            stores,
            totalStores: stores.length,
            message: `Found ${stores.length} stores in marketplace`,
            instruction: 'Use the storeId for commerce operations (searchProducts, createCart, etc.)'
          }, null, 2),
        }],
      }
    };
  }

  throw new Error(`Store tool ${name} not found`);
}