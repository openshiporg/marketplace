import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getPlatformAdapter } from '../adapters';
import { parseStoreConfigs } from '../types/store-config';

async function resolveAdapter(storeId: string) {
  const stores = parseStoreConfigs();
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error(`Unknown store: ${storeId}. Available stores: ${stores.map(s => s.id).join(', ')}`);
  const adapter = await getPlatformAdapter(store);
  return { store, adapter } as const;
}

export const regionTools: Tool[] = [
  {
    name: 'getAvailableCountries',
    description: `Get list of countries we ship to. Use this to automatically determine which country to show products for.

After calling this:
1. Check if "us" exists in the countries list (check the countryCode field, case-insensitive)
2. If yes, use "us" as the countryCode for product/cart operations
3. If no, use the first country's countryCode from the list
4. The countryCode field is already lowercase and ready to use

This allows showing products immediately without asking the user, while keeping them informed about regional pricing.`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        }
      },
      required: ['storeId']
    }
  },
  {
    name: 'getAvailableRegions',
    description: `Get detailed list of regions and countries with currency information. Similar to getAvailableCountries but with more regional details.

Use the same automatic country selection logic:
1. Prefer "us" if available
2. Otherwise use first country
3. Inform user about the selected region`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        }
      },
      required: ['storeId']
    }
  }
];

export async function handleRegionTools(name: string, args: any, cookie: string, ctoken?: string) {
  if (name === 'getAvailableCountries') {
    const { storeId } = args;

    const { store, adapter } = await resolveAdapter(storeId);
    const countries = await adapter.getAvailableCountries({ store, cookie, ctoken });

    const allCountries = (countries || []).map((c: any) => ({
      code: (c.code || '').toLowerCase(),
      name: c.name,
      countryCode: (c.code || '').toLowerCase(),
      currency: c.currency
    }));

    allCountries.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            countries: allCountries,
            totalCountries: allCountries.length,
            availableCurrencies: [...new Set(allCountries.map((c: any) => c.currency))],
            friendlyCountryList: allCountries.map((c: any) => c.name).join(', '),
            message: `We ship to ${allCountries.length} countries worldwide!`,
            storeId
          }, null, 2),
        }],
      }
    };
  }

  if (name === 'getAvailableRegions') {
    const { storeId } = args;

    const { store, adapter } = await resolveAdapter(storeId);
    const countries = await adapter.getAvailableCountries({ store, cookie, ctoken });
    const sym = (code: string) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';

    // Map to the legacy flattened shape expected by the UI
    const allCountries = (countries || []).map((c: any) => ({
      countryCode: (c.code || '').toUpperCase(),
      countryName: c.name,
      // Region data not available cross-platform; use country code as a stable key
      regionId: (c.code || '').toUpperCase(),
      regionName: c.name,
      currency: (c.currency || '').toUpperCase(),
      currencySymbol: sym((c.currency || '').toUpperCase()),
    }));

    allCountries.sort((a: any, b: any) => a.countryName.localeCompare(b.countryName));

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            countries: allCountries,
            totalCountries: allCountries.length,
            message: 'Available shipping destinations',
            instruction: 'Please choose your country to see products and pricing for your area.',
            friendlyCountryList: allCountries.map((c: any) => c.countryName).join(', '),
            storeId
          }, null, 2),
        }],
      }
    };
  }

  throw new Error(`Region tool ${name} not found`);
}