import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { parseStoreConfigs } from '../types/store-config';
import { getPlatformAdapter } from '../adapters';
import { createUIResource } from './utils';
import { renderMcpCard } from '../../../../mcp-ui/server/shell';
import { safeHttpUrl } from '@/lib/safe-content';

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

    // Real imagery and a catalog size for the Stores card: the first product's picture and the product count.
    const samples = await Promise.all(parsed.map(async (cfg, i) => {
      const x: any = stores[i];
      try {
        const adapter = await getPlatformAdapter(cfg);
        const country = String(x.countryCode || x.countries?.[0]?.code || 'us').toLowerCase();
        const list: any[] = await Promise.race([
          adapter.searchProducts({ store: cfg, countryCode: country, limit: 50 }),
          new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        const image = list.map((p: any) => safeHttpUrl(p.thumbnail, cfg.baseUrl)).find(Boolean);
        return { image: image || undefined, productCount: list.length };
      } catch {
        return {} as { image?: string; productCount?: number };
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
        }, createUIResource({
          uri: 'ui://marketplace/stores',
          content: { type: 'rawHtml', htmlString: await renderMcpCard({ kind: 'stores', data: { stores: stores.map((x: any) => ({ storeId: x.storeId, name: x.name, platform: x.platform, address: x.address || undefined, countryCode: x.countryCode || undefined, image: samples[stores.indexOf(x)]?.image, productCount: samples[stores.indexOf(x)]?.productCount })) } }, 'Stores') },
          encoding: 'text',
        })],
      }
    };
  }

  throw new Error(`Store tool ${name} not found`);
}