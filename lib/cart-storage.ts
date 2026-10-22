/**
 * Multi-store cart management using localStorage
 *
 * Structure:
 * {
 *   "source-v2-openfront-https_3A_2F_2Fmerchant.example": { cartId: "cart_123", createdAt: 1234567890 }
 * }
 */

const CART_STORAGE_KEY = 'openfront_marketplace_carts';

export interface CartInfo {
  cartId: string;
  createdAt: number;
  storeName?: string; // Optional: friendly name for the store
  /** Source-issued guest-cart proof, scoped to this exact store ID. */
  cartProof?: string;
}

export interface MultiStoreCartStorage {
  [storeId: string]: CartInfo;
}

/**
 * Get all carts from localStorage
 */
export function getAllCarts(): MultiStoreCartStorage {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading carts from localStorage:', error);
    return {};
  }
}

/**
 * Get cart ID for a specific store
 */
export function getCartId(storeId: string): string | null {
  const carts = getAllCarts();
  return carts[storeId]?.cartId || null;
}

/** Get the source-issued proof for one store's guest cart. */
export function getCartProof(storeId: string): string | null {
  const carts = getAllCarts();
  return carts[storeId]?.cartProof || null;
}

/** Return only source/cart identity for transport headers and AI context. */
export function getAllCartIds(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getAllCarts())
      .filter(([, cart]) => typeof cart?.cartId === 'string' && cart.cartId.length > 0)
      .map(([storeId, cart]) => [storeId, cart.cartId]),
  );
}

/** Return source-scoped proofs separately so they never enter model context. */
export function getAllCartProofs(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getAllCarts())
      .filter(([, cart]) => typeof cart?.cartProof === 'string' && cart.cartProof.length > 0)
      .map(([storeId, cart]) => [storeId, cart.cartProof!]),
  );
}

/**
 * Set cart identity for a specific store. When a response only confirms the
 * cart ID, retain the existing proof for that same cart.
 */
export function setCartId(
  storeId: string,
  cartId: string,
  storeName?: string,
  cartProof?: string,
): void {
  if (typeof window === 'undefined') return;

  try {
    const carts = getAllCarts();
    const existing = carts[storeId];
    carts[storeId] = {
      cartId,
      createdAt: existing?.cartId === cartId ? existing.createdAt : Date.now(),
      storeName: storeName ?? existing?.storeName,
      cartProof: cartProof ?? (existing?.cartId === cartId ? existing.cartProof : undefined),
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carts));

    // Dispatch custom event to notify other components that cart was updated
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { storeId, cartId, storeName }
    }));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

/**
 * Remove cart for a specific store
 */
export function removeCartId(storeId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const carts = getAllCarts();
    delete carts[storeId];
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carts));

    // Dispatch custom event to notify other components that cart was removed
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { storeId, cartId: null, removed: true }
    }));
  } catch (error) {
    console.error('Error removing cart from localStorage:', error);
  }
}

/**
 * Clear all carts
 */
export function clearAllCarts(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing carts from localStorage:', error);
  }
}

/**
 * Get list of all store endpoints with carts
 */
export function getStoresWithCarts(): string[] {
  return Object.keys(getAllCarts());
}

/**
 * Get cart count for a specific store (if available in localStorage)
 * This is just cart existence check, not actual item count
 */
export function hasCart(storeId: string): boolean {
  return !!getCartId(storeId);
}
