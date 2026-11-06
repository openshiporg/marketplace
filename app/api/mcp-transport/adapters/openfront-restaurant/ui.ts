import type { Product } from '../types';
import { productCardHtml } from '../../../../../mcp-ui/server/cards';

/** Restaurant menu item card (TuffUI, rendered in the browser; see mcp-ui/). */
export function generateRestaurantProductUI(params: { storeId: string; storeUrl: string; product: Product; countryCode: string }): Promise<string> {
  const { storeId, storeUrl, product, countryCode } = params;
  return productCardHtml(storeId, countryCode, { ...product, metadata: { ...product.metadata, vertical: 'restaurant' } }, storeUrl);
}
