const PRODUCT_TOOLS = new Set(['addToCart']);
const CART_TOOLS = new Set([
  'viewCart',
  'updateCartItem',
  'removeCartItem',
  'setShippingMethod',
  'setRestaurantFulfillment',
  'initiatePaymentSession',
  'getCheckoutLink',
]);
const LOGIN_TOOLS = new Set(['authenticateUser', 'loginUser']);
const DISCOVERY_TOOLS = new Set(['addToCart', 'getProduct']);

function sameString(value: unknown, expected: string | null): boolean {
  return typeof value === 'string' && value === expected;
}

/**
 * MCP UI HTML is remote content. Bind each iframe's tool calls to its resource
 * and the cart/source identifiers embedded in that resource before issuing a
 * local MCP request.
 */
export function isPermittedMcpUiAction(
  resourceUri: string | undefined,
  toolName: unknown,
  params: unknown
): boolean {
  if (!resourceUri || typeof toolName !== 'string' || !params || typeof params !== 'object') return false;

  try {
    const resource = new URL(resourceUri);
    const values = params as Record<string, unknown>;
    const storeId = resource.searchParams.get('store');

    if (resource.pathname.includes('/product/')) {
      return PRODUCT_TOOLS.has(toolName) && sameString(values.storeId, storeId);
    }

    if (resource.pathname.includes('/cart/')) {
      const cartId = resource.pathname.split('/cart/')[1]?.split('/')[0] || null;
      return CART_TOOLS.has(toolName)
        && sameString(values.storeId, storeId)
        && sameString(values.cartId, cartId);
    }

    if (resource.pathname.includes('/discover-products')) {
      const admittedStoreIds = resource.searchParams.getAll('store');
      return DISCOVERY_TOOLS.has(toolName)
        && typeof values.storeId === 'string'
        && admittedStoreIds.includes(values.storeId);
    }

    if (resource.pathname.includes('/login/') || resource.pathname.includes('/email-conflict/')) {
      return LOGIN_TOOLS.has(toolName) && sameString(values.storeId, storeId);
    }
  } catch {
    return false;
  }

  return false;
}
