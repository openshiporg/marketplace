const PRODUCT_TOOLS = new Set(['addToCart']);
const CART_TOOLS = new Set([
  'viewCart',
  'updateCartItem',
  'removeCartItem',
  'setShippingAddress',
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
    if (resource.protocol !== 'ui:' || resource.hostname !== 'marketplace' || resource.username || resource.password || resource.port || resource.hash) return false;
    const values = params as Record<string, unknown>;
    const storeId = resource.searchParams.get('store');

    if (/^\/product\/[^/]+$/.test(resource.pathname)) {
      return PRODUCT_TOOLS.has(toolName) && sameString(values.storeId, storeId);
    }

    if (/^\/cart\/[^/]+$/.test(resource.pathname)) {
      const cartId = resource.pathname.slice('/cart/'.length);
      if (toolName === 'discoverProducts') {
        return Array.isArray(values.storeIds) && values.storeIds.length === 1
          && sameString(values.storeIds[0], storeId);
      }
      return CART_TOOLS.has(toolName)
        && sameString(values.storeId, storeId)
        && sameString(values.cartId, cartId);
    }

    if (resource.pathname === '/discover-products') {
      const admittedStoreIds = resource.searchParams.getAll('store');
      return DISCOVERY_TOOLS.has(toolName)
        && typeof values.storeId === 'string'
        && admittedStoreIds.includes(values.storeId);
    }

    if (resource.pathname === '/login' || resource.pathname === '/email-conflict') {
      const cartId = resource.searchParams.get('cart');
      const isEmailUpdate = resource.pathname === '/email-conflict' && toolName === 'setShippingAddress' && Boolean(cartId);
      return (LOGIN_TOOLS.has(toolName) || isEmailUpdate)
        && sameString(values.storeId, storeId)
        && (cartId === null ? !isEmailUpdate : sameString(values.cartId, cartId));
    }
  } catch {
    return false;
  }

  return false;
}

/** Permit only fixed, non-sensitive choices from the conflict interface. */
export function isPermittedMcpUiPrompt(resourceUri: string | undefined, prompt: unknown): boolean {
  try {
    const resource = new URL(resourceUri || '');
    return resource.protocol === 'ui:' && resource.hostname === 'marketplace'
      && !resource.username && !resource.password && !resource.port && !resource.hash
      && resource.pathname === '/email-conflict'
      && Boolean(resource.searchParams.get('store')) && Boolean(resource.searchParams.get('cart'))
      && (prompt === 'I want to use a different email for this order'
        || prompt === 'I want to continue to the source checkout');
  } catch {
    return false;
  }
}
