import { ParsedStore } from '../types/store-config';

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number; // in minor units (e.g., cents)
  currency: string; // e.g., USD
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  options?: Array<{ name: string; value: string }>;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  description?: string;
  variants: ProductVariant[];
}

export interface CartLineItem {
  id: string;
  quantity: number;
  variantId: string;
  productTitle: string;
  price: number; // in minor units
}

export interface Cart {
  id: string;
  lineItems: CartLineItem[];
  subtotal: number;
  total: number;
  currency: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  logoIcon?: string;
  logoColor?: string;
  paymentProviders?: Array<{ provider: string; publishableKey?: string }>;
}

export interface PlatformAdapter {
  // Product operations
  searchProducts(params: {
    store: ParsedStore;
    countryCode: string;
    limit?: number;
    cookie?: string;
    ctoken?: string;
  }): Promise<Product[]>;

  getProduct(params: {
    store: ParsedStore;
    productId: string;
    countryCode: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<Product>;

  // Cart operations
  createCart(params: {
    store: ParsedStore;
    countryCode: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<Cart>;

  addToCart(params: {
    store: ParsedStore;
    cartId: string;
    variantId: string;
    quantity: number;
    cookie?: string;
    ctoken?: string;
  }): Promise<Cart>;

  getCart(params: {
    store: ParsedStore;
    cartId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<Cart>;

  // Raw/full cart for UI needs
  getCartRaw(params: {
    store: ParsedStore;
    cartId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<any>;

  // Shipping options and methods
  getCartShippingOptions(params: {
    store: ParsedStore;
    cartId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<any[]>;

  setShippingMethod(params: {
    store: ParsedStore;
    cartId: string;
    shippingMethodId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<any>; // returns cart raw

  updateCartItemQuantity(params: {
    store: ParsedStore;
    cartId: string;
    lineItemId: string;
    quantity: number;
    cookie?: string;
    ctoken?: string;
  }): Promise<any>; // returns cart raw

  removeCartItem(params: {
    store: ParsedStore;
    cartId: string;
    lineItemId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<any>; // returns cart raw

  // Authentication
  authenticateUser(params: {
    store: ParsedStore;
    email: string;
    password: string;
  }): Promise<{
    sessionToken: string;
    user: { id: string; email: string; activeCartId?: string };
  }>;

	  // Cart association (optional helper)
	  connectCartToUser(params: {
	    store: ParsedStore;
	    cartId: string;
	    userId: string;
	    email: string;
	    cookie?: string;
	    ctoken?: string;
	  }): Promise<void>;


  // Checkout operations
  setShippingAddress(params: {
    store: ParsedStore;
    cartId: string;
    address: {
      firstName: string;
      lastName: string;
      address1: string;
      city: string;
      province: string;
      postalCode: string;
      countryCode: string;
      phone: string;
      email: string;
      company?: string;
    };
    cookie?: string;
    ctoken?: string;
  }): Promise<Cart>;

  buildCheckoutLink(params: {
    store: ParsedStore;
    cartId: string;
    countryCode: string;
  }): Promise<string>;

  // Payments
  getAvailablePaymentMethods(params: {
    store: ParsedStore;
    regionId: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<Array<{ id: string; name: string; code: string; isInstalled?: boolean }>>;

  initiatePaymentSession(params: {
    store: ParsedStore;
    cartId: string;
    paymentProviderCodeOrName: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<{ id: string; data: any; amount: number }>;

  completeCart(params: {
    store: ParsedStore;
    cartId: string;
    paymentSessionId?: string;
    cookie?: string;
    ctoken?: string;
  }): Promise<any>; // returns order raw

  // Store info
  getStoreInfo(params: { store: ParsedStore; cookie?: string; ctoken?: string }): Promise<StoreInfo>;

  // Region operations
  getAvailableCountries(params: {
    store: ParsedStore;
    cookie?: string;
    ctoken?: string;
  }): Promise<Array<{ code: string; name: string; currency: string }>>;

  // Optional UI generation methods
  generateCartUI?(params: {
    store: ParsedStore;
    cartId: string;
    storeInfo: StoreInfo;
    cartData: any;
    shippingOptions: any[];
    cookie?: string;
    ctoken?: string;
  }): Promise<string>;

  generateLoginUI?(params: {
    store: ParsedStore;
    storeId: string;
    email?: string;
    message?: string;
    cartId?: string;
    addressData?: any;
  }): Promise<string>;

  generateEmailConflictUI?(params: {
    store: ParsedStore;
    storeId: string;
    email: string;
    cartId: string;
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    postalCode: string;
    countryCode: string;
    province: string;
    company: string;
    phone: string;
    storeName: string;
    checkoutUrl: string;
  }): Promise<string>;
}

