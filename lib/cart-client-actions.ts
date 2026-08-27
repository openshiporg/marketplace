import {
  getCartId,
  getCartProof,
  removeCartId,
  setCartId,
} from '@/lib/cart-storage';
import { setSession } from '@/lib/session-storage';

type JsonObject = Record<string, unknown>;

export type CartLifecycleChange =
  | { type: 'saved'; storeId: string; cartId: string; cartProof?: string; changed: boolean }
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

function getClientAction(value: unknown, data?: JsonObject | null): JsonObject | null {
  let envelope = parseJsonObject(value);
  if (envelope && isJsonObject(envelope.result)) envelope = envelope.result;
  const meta = envelope && isJsonObject(envelope._meta) ? envelope._meta : null;
  const marketplaceMeta = meta && isJsonObject(meta.marketplace) ? meta.marketplace : null;
  if (marketplaceMeta && isJsonObject(marketplaceMeta.clientAction)) {
    return marketplaceMeta.clientAction;
  }
  return data && isJsonObject(data.__clientAction) ? data.__clientAction : null;
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
): { storeId: string; cartId: string; cartProof?: string } | null {
  const data = getMcpToolResultData(value);
  if (!data) return null;

  const clientAction = getClientAction(value, data);
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
  const cartProof = clientAction?.type === 'saveCartId' && typeof clientAction.cartProof === 'string'
    ? clientAction.cartProof
    : undefined;

  return storeId && cartId ? { storeId, cartId, cartProof } : null;
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

  const clientAction = getClientAction(value, data);
  if (!clientAction) return null;

  const actionStoreId = typeof clientAction.storeId === 'string'
    ? clientAction.storeId
    : storeId;
  if (
    clientAction.type === 'saveSessionToken' &&
    actionStoreId &&
    typeof clientAction.sessionToken === 'string'
  ) {
    setSession(actionStoreId, {
      token: clientAction.sessionToken,
      email: typeof clientAction.email === 'string' ? clientAction.email : undefined,
      userId: typeof clientAction.userId === 'string' ? clientAction.userId : undefined,
      activeCartId: typeof clientAction.activeCartId === 'string' ? clientAction.activeCartId : undefined,
    });
  }

  const actionCartId = clientAction.type === 'saveCartId' && typeof clientAction.cartId === 'string'
    ? clientAction.cartId
    : clientAction.type === 'saveSessionToken' && typeof clientAction.activeCartId === 'string'
      ? clientAction.activeCartId
      : null;
  const actionCartProof = clientAction.type === 'saveCartId' && typeof clientAction.cartProof === 'string'
    ? clientAction.cartProof
    : undefined;

  if (!actionStoreId || !actionCartId) return null;

  const changed = getCartId(actionStoreId) !== actionCartId || (
    typeof actionCartProof === 'string' && getCartProof(actionStoreId) !== actionCartProof
  );
  const storeName = typeof data.storeName === 'string' ? data.storeName : undefined;
  // Always write when a proof is returned so an old cartId-only entry is
  // upgraded even if the source kept the same cart ID.
  if (changed || actionCartProof) {
    setCartId(actionStoreId, actionCartId, storeName, actionCartProof);
  }

  return {
    type: 'saved',
    storeId: actionStoreId,
    cartId: actionCartId,
    cartProof: actionCartProof,
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
