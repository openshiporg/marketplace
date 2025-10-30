/**
 * Multi-store cart management using localStorage
 *
 * Structure:
 * {
 *   "store-1": { cartId: "cart_123", createdAt: 1234567890 },
 *   "store-2": { cartId: "cart_456", createdAt: 1234567890 }
 * }
 */

const CART_STORAGE_KEY = 'openfront_marketplace_carts';

export interface CartInfo {
  cartId: string;
  createdAt: number;
  storeName?: string; // Optional: friendly name for the store
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

/**
 * Set cart ID for a specific store
 */
export function setCartId(storeId: string, cartId: string, storeName?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const carts = getAllCarts();
    carts[storeId] = {
      cartId,
      createdAt: Date.now(),
      storeName,
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
