import { cartCardHtml, restaurantCartData } from '../../../../../mcp-ui/server/cards';

/** Restaurant cart card (TuffUI, rendered in the browser; see mcp-ui/). */
export function generateRestaurantCartUI(params: { storeId: string; cartId: string; cart: any; storeInfo: any; storeUrl: string }): Promise<string> {
  return cartCardHtml(restaurantCartData(params));
}
