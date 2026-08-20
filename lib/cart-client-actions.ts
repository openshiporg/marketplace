import {
  getCartId,
  removeCartId,
  setCartId,
} from '@/lib/cart-storage';

type JsonObject = Record<string, unknown>;

export type CartLifecycleChange =
  | { type: 'saved'; storeId: string; cartId: string; changed: boolean }
  | { type: 'cleared'; storeId: string; changed: boolean };

const cartMutationQueues = new Map<string, Promise<unknown>>();

const CART_MUTATION_TOOLS = new Set([
  'addToCart',
  'updateCartItem',
  'removeCartItem',
  'setShippingAddress',
  'setShippingMethod',
  'setRestaurantFulfillment',
  'initiatePaymentSession',
]);

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: unknown): JsonObject | null {
  if (isJsonObject(value)) return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return isJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Read the JSON payload from either a complete JSON-RPC response, an MCP tool
 * result, or the text content inside a tool result.
 */
export function getMcpToolResultData(value: unknown): JsonObject | null {
  let result = parseJsonObject(value);
  if (!result) return null;

  if (!Array.isArray(result.content) && isJsonObject(result.result)) {
    result = result.result;
  }

  if (!Array.isArray(result.content)) return result;

  for (const content of result.content) {
    if (!isJsonObject(content) || content.type !== 'text') continue;
    const data = parseJsonObject(content.text);
    if (data) return data;
  }

  return null;
}

/**
 * Apply the cart lifecycle instruction returned by an MCP tool. This is the
 * only place direct tool responses should write cart identity to localStorage.
 */
export function getCartIdentityFromToolResult(
  value: unknown
): { storeId: string; cartId: string } | null {
  const data = getMcpToolResultData(value);
  if (!data) return null;

  const clientAction = isJsonObject(data.__clientAction) ? data.__clientAction : null;
  const cart = isJsonObject(data.cart) ? data.cart : null;
  const storeId = typeof data.storeId === 'string'
    ? data.storeId
    : typeof clientAction?.storeId === 'string'
      ? clientAction.storeId
      : null;
  const cartId = typeof cart?.id === 'string'
    ? cart.id
    : clientAction?.type === 'saveCartId' && typeof clientAction.cartId === 'string'
      ? clientAction.cartId
      : null;

  return storeId && cartId ? { storeId, cartId } : null;
}

export function applyCartLifecycleFromToolResult(value: unknown): CartLifecycleChange | null {
  const data = getMcpToolResultData(value);
  if (!data) return null;

  const storeId = typeof data.storeId === 'string' ? data.storeId : null;
  if (data.clearCartId === true && storeId) {
    const changed = getCartId(storeId) !== null;
    if (changed) removeCartId(storeId);
    return { type: 'cleared', storeId, changed };
  }

  const clientAction = isJsonObject(data.__clientAction) ? data.__clientAction : null;
  if (!clientAction) return null;

  const actionStoreId = typeof clientAction.storeId === 'string'
    ? clientAction.storeId
    : storeId;
  const actionCartId = clientAction.type === 'saveCartId' && typeof clientAction.cartId === 'string'
    ? clientAction.cartId
    : clientAction.type === 'saveSessionToken' && typeof clientAction.activeCartId === 'string'
      ? clientAction.activeCartId
      : null;

  if (!actionStoreId || !actionCartId) return null;

  const changed = getCartId(actionStoreId) !== actionCartId;
  if (changed) {
    const storeName = typeof data.storeName === 'string' ? data.storeName : undefined;
    setCartId(actionStoreId, actionCartId, storeName);
  }

  return {
    type: 'saved',
    storeId: actionStoreId,
    cartId: actionCartId,
    changed,
  };
}

export function isCartMutationTool(toolName: string): boolean {
  return CART_MUTATION_TOOLS.has(toolName);
}

/**
 * Serialize direct cart mutations for one store. The next operation builds its
 * request only after the previous response has persisted its authoritative
 * cart ID, preventing parallel first additions from creating separate carts.
 */
export async function serializeCartMutation<T>(
  storeId: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!storeId) return operation();

  const previous = cartMutationQueues.get(storeId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  cartMutationQueues.set(storeId, current);

  try {
    return await current;
  } finally {
    if (cartMutationQueues.get(storeId) === current) {
      cartMutationQueues.delete(storeId);
    }
  }
}
