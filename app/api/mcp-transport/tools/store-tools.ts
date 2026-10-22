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

export async function handleStoreTools(name: string, args: any, _cookie: string, _ctoken?: string, customConfig?: any[]) {
  if (name === 'getAvailableStores') {
    const parsed = parseStoreConfigs(customConfig);

    // Enrich each store with live store info from its platform adapter (name, logoIcon, logoColor, paymentProviders)
    const stores = await Promise.all(parsed.map(async (s) => {
      // User-defined name takes priority
      const userDefinedName = s.name || s.storeName;
      
      try {
        const adapter = await getPlatformAdapter(s);
        const [infoResult, countriesResult] = await Promise.allSettled([
          adapter.getStoreInfo({ store: s }),
          adapter.getAvailableCountries({ store: s }),
        ]);
        const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
        const countries = countriesResult.status === 'fulfilled' ? countriesResult.value : [];
        if (!info && countries.length === 0) {
          throw infoResult.status === 'rejected' ? infoResult.reason : new Error('Store metadata unavailable');
        }
        return {
          id: s.id,
          storeId: s.id,
          name: userDefinedName || info?.name || new URL(s.baseUrl).hostname,
          platform: s.platform,
          baseUrl: s.baseUrl,
          logoIcon: info?.logoIcon || null,
          logoColor: info?.logoColor || null,
          address: info?.address || null,
          countryCode: info?.countryCode || null,
          countries,
          paymentProviders: info?.paymentProviders || [],
        } as const;
      } catch (e) {
        // Fallback if adapter or store query fails
        console.error('[getAvailableStores] Source metadata unavailable', { sourceId: s.id, errorName: e instanceof Error ? e.name : 'UnknownError' });
        return {
          id: s.id,
          storeId: s.id,
          name: userDefinedName || new URL(s.baseUrl).hostname,
          platform: s.platform,
          baseUrl: s.baseUrl,
          logoIcon: null,
          logoColor: null,
          address: null,
          countryCode: null,
          countries: [] as Array<{ code: string; name: string; currency: string }>,
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
            instruction: 'Use storeId for commerce operations. Route by platform, and use only explicit address/country metadata for location requests.'
          }, null, 2),
        }],
      }
    };
  }

  throw new Error(`Store tool ${name} not found`);
}