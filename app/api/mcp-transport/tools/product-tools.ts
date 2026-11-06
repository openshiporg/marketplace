import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from './utils';
import { renderMcpCard } from '../../../../mcp-ui/server/shell';
import { productCardHtml } from '../../../../mcp-ui/server/cards';
import { slimProduct } from '../../../../mcp-ui/server/slim';
import { parseStoreConfigs } from '../types/store-config';
import { getPlatformAdapter } from '../adapters';
import { getStoreLogoHue } from '@/lib/store-logo';
import {
  discoveryPlatformForTool,
  parseMarketplaceDiscoveryInput,
  productMatchesDiscoveryQuery,
  selectDiscoveryStores,
  storeMatchesDiscoveryLocation,
  type MarketplaceDiscoveryToolName,
} from '@/lib/marketplace-discovery';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

async function resolveAdapter(storeId: string, customConfig?: any[]) {
  const stores = parseStoreConfigs(customConfig);
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error(`Unknown store: ${storeId}. Available stores: ${stores.map(s => s.id).join(', ')}`);
  const adapter = await getPlatformAdapter(store);
  return { store, adapter } as const;
}



const discoveryInputProperties = {
  query: {
    type: 'string',
    maxLength: 80,
    description: 'Only the item or dish keywords, for example "t-shirt", "burger", or "vegan". Do not include location words.',
  },
  location: {
    type: 'string',
    maxLength: 80,
    description: 'Optional city, region, or country. Results are included only when a source explicitly reports matching public location metadata.',
  },
  countryCode: {
    type: 'string',
    pattern: '^[A-Za-z]{2}$',
    description: 'Optional two-letter country code for source availability and pricing, for example "ca" or "us".',
  },
  storeIds: {
    type: 'array',
    maxItems: 20,
    items: { type: 'string' },
    description: 'Optional stable source IDs returned by getAvailableStores. Every ID must belong to this tool\'s vertical.',
  },
  limit: {
    type: 'integer',
    minimum: 1,
    maximum: 24,
    description: 'Maximum matching results per source. Defaults to 10.',
  },
} as const;

export const productTools: Tool[] = [
  {
    name: 'getProduct',
    description: `Get detailed product information by ID.

IMPORTANT COUNTRY SELECTION LOGIC:
1. If countryCode is missing, call getAvailableCountries
2. Prefer "us" if available, otherwise use first country
3. Inform the user which country's pricing they're seeing`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Stable source ID returned by getAvailableStores'
        },
        productId: {
          type: 'string',
          description: 'Product ID'
        },
        countryCode: {
          type: 'string',
          description: 'Country code for pricing (e.g., "us", "ca", "gb"). Must be lowercase.'
        }
      },
      required: ['storeId', 'productId', 'countryCode']
    }
  },
  {
    name: 'discoverProducts',
    description: `Discover retail and e-commerce products only. This tool never returns restaurant menus.

Call getAvailableStores first. Pass concise item keywords in query (for example "t-shirt" or "scarf"), and pass storeIds when the user selected a particular admitted store. Omit query only when the user explicitly wants to browse all retail products. Use discoverRestaurantMenus—not this tool—for restaurants, food, dishes, takeout, or menus. Location filters fail closed when a source does not publish matching location metadata.`,
    inputSchema: {
      type: 'object',
      properties: discoveryInputProperties,
      additionalProperties: false,
      required: []
    }
  },
  {
    name: 'discoverRestaurantMenus',
    description: `Discover restaurants and orderable menu items only. This tool never returns retail or e-commerce products.

Call getAvailableStores first. Use query only for cuisine, dish, dietary, or menu keywords (for example "burger" or "vegan"). Put city/region/country text in location, not query, and use countryCode when known. Pass storeIds when the user selected a particular admitted restaurant. Omit query to browse matching restaurant menus. Location filters fail closed when a source does not explicitly publish matching public location metadata.`,
    inputSchema: {
      type: 'object',
      properties: discoveryInputProperties,
      additionalProperties: false,
      required: []
    }
  }
];

// Size ordering constant (matching OpenFront storefront)
const SIZE_ORDER: Record<string, number> = {
  "XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "XL": 6, "XXL": 7, "XXXL": 8
};

// Helper function to find the cheapest price from variants (matching OpenFront getProductPrice logic)
function getCheapestPrice(variants: any[], currencyCode: string) {
  if (!variants || variants.length === 0) return null;

  let cheapestPrice = null;
  for (const variant of variants) {
    const price = variant.prices?.find((p: any) => p.currency.code === currencyCode);
    if (price && price.calculatedPrice) {
      if (!cheapestPrice ||
          (price.calculatedPrice.calculatedAmount < cheapestPrice.calculatedPrice.calculatedAmount)) {
        cheapestPrice = price;
      }
    }
  }
  return cheapestPrice;
}

// Helper function to sort option values (matching OpenFront OptionSelect sorting)
function sortOptionValues(values: string[], optionTitle: string): string[] {
  return values.sort((a: string, b: string) => {
    if (optionTitle.toLowerCase() === "size") {
      const aOrder = SIZE_ORDER[a as keyof typeof SIZE_ORDER] || 999;
      const bOrder = SIZE_ORDER[b as keyof typeof SIZE_ORDER] || 999;
      return aOrder - bOrder;
    }
    return a.localeCompare(b);
  });
}

const emptyResource = async (title: string, message: string, query?: string) => createUIResource({
  uri: `ui://marketplace/empty?title=${encodeURIComponent(title)}`,
  content: { type: 'rawHtml', htmlString: await renderMcpCard({ kind: 'empty', data: { title, message, query } }, title) },
  encoding: 'text',
});

export async function handleProductTools(name: string, args: any, _cookie: string, _ctoken?: string, customConfig?: any[]) {
  if (name === 'getProduct') {
    const { storeId, productId, productHandle, countryCode } = args;

    const whereClause = productId ? { id: productId } : { handle: productHandle };
    if (!productId && !productHandle) {
      throw new Error('Either productId or productHandle is required');
    }

    const { store, adapter } = await resolveAdapter(storeId, customConfig);

    // Resolve product ID if only handle provided (platform-agnostic adapters typically key by ID)
    let resolvedProductId = productId;
    if (!resolvedProductId && productHandle) {
      const list = await adapter.searchProducts({ store, countryCode, limit: 50 });
      const hit = list.find((pp: any) => pp.handle === productHandle);
      resolvedProductId = hit?.id;
    }
    if (!resolvedProductId) {
      throw new Error('Product not found');
    }

    const p = await adapter.getProduct({ store, productId: resolvedProductId, countryCode });

    if (adapter.generateProductUI) {
      const htmlContent = await adapter.generateProductUI({
        store,
        storeId,
        product: p,
        countryCode,
      });
      const uiResource = createUIResource({
        uri: `ui://marketplace/product/${p.id}?country=${countryCode}&store=${encodeURIComponent(storeId)}`,
        content: { type: 'rawHtml', htmlString: htmlContent },
        encoding: 'text',
      });
      return {
        jsonrpc: '2.0',
        result: { content: [uiResource] },
      };
    }

    const htmlContent = await productCardHtml(storeId, countryCode, p, store.baseUrl);

    // Use proper MCP UI format
    const uiResource = createUIResource({
      uri: `ui://marketplace/product/${p.id}?country=${countryCode}&store=${encodeURIComponent(storeId)}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  if (name === 'discoverProducts' || name === 'discoverRestaurantMenus') {
    const toolName = name as MarketplaceDiscoveryToolName;
    const discovery = parseMarketplaceDiscoveryInput(args);
    const configuredStores = parseStoreConfigs(customConfig);
    const stores = selectDiscoveryStores(configuredStores, toolName, discovery);
    const vertical = discoveryPlatformForTool(toolName) === 'openfront-restaurant'
      ? 'restaurant'
      : 'retail';

    if (stores.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              stores: [],
              totalStores: 0,
              vertical,
              message: `No admitted ${vertical} sources match this request.`,
            }),
          }, await emptyResource('No stores available', `No admitted ${vertical === 'restaurant' ? 'restaurant' : 'shop'} sources match this request.`, discovery.query)]
        }
      };
    }

    // Resolve public store/location metadata before fetching a bounded product set.
    const storeDataPromises = stores.map(async (storeConfig) => {
      try {
        const { store, adapter } = await resolveAdapter(storeConfig.id, customConfig);

        const [storeInfo, countries] = await Promise.all([
          adapter.getStoreInfo({ store }),
          adapter.getAvailableCountries({ store }),
        ]);

        if (!storeMatchesDiscoveryLocation(storeInfo, countries, discovery.location)) {
          return null;
        }

        const selectedCountry = discovery.countryCode
          ? countries.find((country: any) => country.code?.toLowerCase() === discovery.countryCode)
          : countries.find((country: any) => country.code?.toLowerCase() === 'us') || countries[0];
        if (!selectedCountry) return null;

        // Fetch enough public results to apply keyword matching locally without
        // interpolating model-provided search text into a source query.
        const sourceLimit = discovery.query ? 50 : discovery.limit;
        const adapterProducts = await adapter.searchProducts({
          store,
          countryCode: selectedCountry.code,
          limit: sourceLimit,
        });
        // Display-only product shape for the TuffUI card
        const products = adapterProducts
          .filter((product) => productMatchesDiscoveryQuery(product, discovery.query))
          .slice(0, discovery.limit)
          .map((p: any) => slimProduct(p, store.baseUrl));

        if (products.length === 0) return null;

        return {
          storeName: storeInfo?.name || 'Unknown Store',
          storeId: store.id,
          platform: store.platform,
          country: { code: selectedCountry.code, name: selectedCountry.name, currency: { code: selectedCountry.currency } },
          products,
        };
      } catch (error) {
        console.error('[Marketplace discovery source failed]', { sourceId: storeConfig.id, errorName: error instanceof Error ? error.name : 'UnknownError' });
        return null;
      }
    });

    const storesData = (await Promise.all(storeDataPromises)).filter(
      (storeData): storeData is NonNullable<typeof storeData> => storeData !== null
    );

    if (storesData.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              stores: [],
              totalStores: 0,
              vertical,
              ...(discovery.query ? { query: discovery.query } : {}),
              ...(discovery.location ? { location: discovery.location } : {}),
              message: `No ${vertical} results matched the requested items, location, and country.`,
            }),
          }, await emptyResource('No results', vertical === 'restaurant' ? 'No menus matched your search.' : 'No products matched your search.', discovery.query)]
        }
      };
    }

    const discoveryTitle = vertical === 'restaurant'
      ? discovery.query ? `Restaurant menus · ${discovery.query}` : 'Restaurant menus'
      : discovery.query ? `Products · ${discovery.query}` : 'Retail products';

    const htmlContent = await renderMcpCard({
      kind: 'discover',
      data: {
        title: discoveryTitle,
        stores: storesData.map((storeData) => ({
          storeId: storeData.storeId,
          name: storeData.storeName,
          platform: storeData.platform,
          countryCode: storeData.country.code,
          currency: storeData.country.currency.code,
          products: storeData.products,
        })),
      },
    }, discoveryTitle);

    const resourceParams = new URLSearchParams({ vertical });
    storesData.forEach((storeData) => resourceParams.append('store', storeData.storeId));
    if (discovery.query) resourceParams.set('query', discovery.query);

    const uiResource = createUIResource({
      uri: `ui://marketplace/discover-products?${resourceParams.toString()}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  throw new Error(`Product tool ${name} not found`);
}