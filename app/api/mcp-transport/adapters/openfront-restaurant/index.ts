import type { Cart, PlatformAdapter, Product, StoreInfo } from '../types';
import { executeGraphQL } from '../../tools/utils';
import { generateOpenFrontEmailConflictUI, generateOpenFrontLoginUI } from '../openfront/ui';
import { generateRestaurantProductUI } from './ui';
import { generateRestaurantCartUI } from './cart-ui';
import { restaurantCartMutationAvailability } from '@/lib/restaurant-cart-capability';

function normalizeImageUrl(baseUrl: string, imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  return imagePath.startsWith('/') ? `${baseUrl}${imagePath}` : imagePath;
}

function extractDocumentText(value: any): string {
  const document = value?.document;
  if (!Array.isArray(document)) return '';
  const collect = (node: any): string => {
    if (!node) return '';
    if (typeof node.text === 'string') return node.text;
    return Array.isArray(node.children) ? node.children.map(collect).join('') : '';
  };
  return document.map(collect).filter(Boolean).join('\n').trim();
}

function cartCookie(_existingCookie: string | undefined, cartId: string): string {
  // Build a source-scoped cookie from the selected Restaurant cart only. Never
  // mix the Marketplace origin's cookie jar into a merchant request.
  return `_restaurant_cart_id=${encodeURIComponent(cartId)}`;
}

function countryName(countryCode: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode.toUpperCase()) || countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

function paymentProviderName(code: string): string {
  if (code.startsWith('pp_stripe')) return 'stripe';
  if (code.startsWith('pp_paypal')) return 'paypal';
  if (code === 'pp_system_default' || code.startsWith('pp_manual')) return 'cash';
  return code;
}

function menuItemToProduct(
  item: any,
  baseUrl: string,
  currency: string,
  cartAvailable?: boolean
): Product {
  return {
    id: item.id,
    title: item.name || 'Menu item',
    handle: item.id,
    thumbnail: normalizeImageUrl(baseUrl, item.thumbnail),
    description: extractDocumentText(item.description),
    variants: [{
      id: item.id,
      title: item.name || 'Menu item',
      sku: item.id,
      price: item.price || 0,
      currency,
      inventoryQuantity: item.available === false ? 0 : 1,
      allowBackorder: false,
    }],
    metadata: {
      vertical: 'restaurant',
      restaurant: {
        available: item.available !== false,
        category: item.category,
        calories: item.calories,
        prepTime: item.prepTime,
        allergens: item.allergens || [],
        dietaryFlags: item.dietaryFlags || [],
        mealPeriods: item.mealPeriods || [],
        modifiers: item.modifiers || [],
        ...(typeof cartAvailable === 'boolean' ? { cartAvailable } : {}),
      },
    },
  };
}

function normalizeCart(raw: any): Cart {
  const currency = raw?.currencyCode || 'USD';
  const lineItems = (raw?.items || []).map((item: any) => {
    const modifierTotal = (item.modifiers || []).reduce(
      (sum: number, modifier: any) => sum + (modifier.priceAdjustment || 0),
      0
    );
    return {
      id: item.id,
      quantity: item.quantity || 1,
      variantId: item.menuItem?.id,
      productTitle: item.menuItem?.name || 'Menu item',
      price: (item.menuItem?.price || 0) + modifierTotal,
    };
  });
  return {
    id: raw?.id,
    lineItems,
    subtotal: raw?.subtotal ?? 0,
    total: raw?.total ?? raw?.subtotal ?? 0,
    currency,
  };
}

async function getRestaurantCartAvailability(
  store: any,
  cookie?: string,
  ctoken?: string
): Promise<boolean | undefined> {
  try {
    const result = await executeGraphQL(
      `query MarketplaceRestaurantCartCapability {
        __type(name: "Mutation") { fields { name } }
      }`,
      store.endpoint,
      cookie || '',
      {},
      ctoken
    );
    return restaurantCartMutationAvailability(
      result.data?.__type?.fields?.map((field: any) => field.name)
    );
  } catch {
    // Marketplace must never advertise cart controls without confirming both
    // required public mutations from the source.
    return false;
  }
}

async function fetchMenuItem(store: any, productId: string, cookie?: string, ctoken?: string) {
  const query = `
    query MarketplaceMenuItem($id: ID!) {
      storeSettings { currencyCode }
      menuItem(where: { id: $id }) {
        id name thumbnail price available calories prepTime allergens dietaryFlags mealPeriods
        description { document }
        category { id name }
        modifiers {
          id name modifierGroup modifierGroupLabel priceAdjustment calories
          defaultSelected required minSelections maxSelections
        }
      }
    }
  `;
  const [result, cartAvailable] = await Promise.all([
    executeGraphQL(query, store.endpoint, cookie || '', { id: productId }, ctoken),
    getRestaurantCartAvailability(store, cookie, ctoken),
  ]);
  return {
    item: result.data?.menuItem,
    currency: result.data?.storeSettings?.currencyCode || 'USD',
    cartAvailable,
  };
}

async function fetchRawCart(store: any, cartId: string, cookie?: string) {
  const result = await executeGraphQL(
    `query MarketplaceRestaurantCart($cartId: ID!) { activeCart(cartId: $cartId) }`,
    store.endpoint,
    cartCookie(cookie, cartId),
    { cartId }
  );
  const cart = result.data?.activeCart;
  if (!cart) return null;
  const lineItems = normalizeCart(cart).lineItems;
  return {
    ...cart,
    lineItems,
    total: cart.total ?? cart.subtotal ?? 0,
    rawSubtotal: cart.subtotal ?? 0,
    rawTotal: cart.total ?? cart.subtotal ?? 0,
    status: cart.order?.id ? 'completed' : 'active',
    shippingAddress: cart.deliveryAddress
      ? {
          address1: cart.deliveryAddress,
          city: cart.deliveryCity,
          province: cart.deliveryState,
          postalCode: cart.deliveryZip,
          countryCode: cart.deliveryCountryCode,
        }
      : null,
    shippingMethods: [],
  };
}

const restaurantAdapter: PlatformAdapter = {
  async searchProducts({ store, limit = 10, cookie, ctoken }) {
    const take = Math.max(1, Math.min(Number(limit) || 10, 50));
    const query = `
      query MarketplaceRestaurantMenu($take: Int!) {
        storeSettings { currencyCode }
        menuItems(
          take: $take
          where: { available: { equals: true } }
          orderBy: [{ featured: desc }, { popular: desc }, { name: asc }]
        ) {
          id name thumbnail price available calories prepTime allergens dietaryFlags mealPeriods
          description { document }
          category { id name }
          modifiers {
            id name modifierGroup modifierGroupLabel priceAdjustment calories
            defaultSelected required minSelections maxSelections
          }
        }
      }
    `;
    const [result, cartAvailable] = await Promise.all([
      executeGraphQL(query, store.endpoint, cookie || '', { take }, ctoken),
      getRestaurantCartAvailability(store, cookie, ctoken),
    ]);
    const currency = result.data?.storeSettings?.currencyCode || 'USD';
    return (result.data?.menuItems || []).map((item: any) =>
      menuItemToProduct(item, store.baseUrl, currency, cartAvailable)
    );
  },

  async getProduct({ store, productId, cookie, ctoken }) {
    const { item, currency, cartAvailable } = await fetchMenuItem(store, productId, cookie, ctoken);
    if (!item) throw new Error('Menu item not found');
    return menuItemToProduct(item, store.baseUrl, currency, cartAvailable);
  },

  async createCart({ store, cookie }) {
    const result = await executeGraphQL(
      `mutation MarketplaceCreateRestaurantCart($orderType: String) {
        createActiveCart(orderType: $orderType) { id orderType }
      }`,
      store.endpoint,
      cookie || '',
      { orderType: 'pickup' }
    );
    const cartId = result.data?.createActiveCart?.id;
    if (!cartId) throw new Error('Restaurant cart could not be created');
    const raw = await fetchRawCart(store, cartId, cookie);
    return normalizeCart(raw);
  },

  async addToCart({ store, cartId, variantId, quantity, modifierIds, specialInstructions, orderType, cookie }) {
    const { item } = await fetchMenuItem(store, variantId, cartCookie(cookie, cartId));
    if (!item || item.available === false) throw new Error('Menu item is not available');

    const availableModifiers = new Map<string, any>((item.modifiers || []).map((modifier: any) => [modifier.id, modifier]));
    const requestedIds: string[] = Array.from(new Set((modifierIds || []).filter((id: string) => availableModifiers.has(id))));
    const resolvedIds: string[] = requestedIds.length > 0
      ? requestedIds
      : (item.modifiers || []).filter((modifier: any) => modifier.defaultSelected).map((modifier: any) => modifier.id);

    const groups = new Map<string, any[]>();
    for (const modifier of item.modifiers || []) {
      const key = modifier.modifierGroup || 'other';
      groups.set(key, [...(groups.get(key) || []), modifier]);
    }
    for (const [groupId, choices] of groups) {
      const selectedCount = choices.filter((choice) => resolvedIds.includes(choice.id)).length;
      const minimum = choices[0]?.required ? Math.max(1, choices[0]?.minSelections || 1) : choices[0]?.minSelections || 0;
      const maximum = Math.max(1, choices[0]?.maxSelections || choices.length);
      if (selectedCount < minimum || selectedCount > maximum) {
        throw new Error(`Choose between ${minimum} and ${maximum} options for ${choices[0]?.modifierGroupLabel || groupId}`);
      }
    }

    await executeGraphQL(
      `mutation MarketplaceAddRestaurantItem($cartId: ID!, $input: ActiveCartItemInput!) {
        addActiveCartItem(cartId: $cartId, input: $input) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      {
        cartId,
        input: {
          menuItemId: variantId,
          quantity,
          modifierIds: resolvedIds,
          ...(specialInstructions ? { specialInstructions } : {}),
        },
      }
    );
    const raw = await fetchRawCart(store, cartId, cookie);
    return normalizeCart(raw);
  },

  async getCart({ store, cartId, cookie }) {
    const raw = await fetchRawCart(store, cartId, cookie);
    if (!raw) throw new Error('Restaurant cart not found');
    return normalizeCart(raw);
  },

  async getCartRaw({ store, cartId, cookie }) {
    return fetchRawCart(store, cartId, cookie);
  },

  async getCartShippingOptions() {
    return [];
  },

  async setShippingMethod({ store, cartId, cookie }) {
    return fetchRawCart(store, cartId, cookie);
  },

  async updateCartItemQuantity({ store, cartId, lineItemId, quantity, cookie }) {
    const result = await executeGraphQL(
      `mutation MarketplaceUpdateRestaurantItem($cartItemId: ID!, $quantity: Int!) {
        updateCartItemQuantity(cartItemId: $cartItemId, quantity: $quantity) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartItemId: lineItemId, quantity }
    );
    return result.data?.updateCartItemQuantity;
  },

  async removeCartItem({ store, cartId, lineItemId, cookie }) {
    const result = await executeGraphQL(
      `mutation MarketplaceRemoveRestaurantItem($cartItemId: ID!) {
        removeCartItem(cartItemId: $cartItemId) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartItemId: lineItemId }
    );
    return result.data?.removeCartItem;
  },

  async authenticateUser({ store, email, password }) {
    const result = await executeGraphQL(
      `mutation MarketplaceRestaurantLogin($email: String!, $password: String!) {
        authenticateUserWithPassword(email: $email, password: $password) {
          ... on UserAuthenticationWithPasswordSuccess { sessionToken item { id email } }
          ... on UserAuthenticationWithPasswordFailure { message __typename }
        }
      }`,
      store.endpoint,
      '',
      { email, password }
    );
    const auth = result.data?.authenticateUserWithPassword;
    if (!auth || auth.__typename === 'UserAuthenticationWithPasswordFailure') {
      throw new Error(auth?.message || 'Authentication failed');
    }
    return { sessionToken: auth.sessionToken, user: { id: auth.item.id, email: auth.item.email } };
  },

  async connectCartToUser({ store, cartId, userId, email, cookie }) {
    await executeGraphQL(
      `mutation MarketplaceConnectRestaurantCart($cartId: ID!, $data: ActiveCartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartId, data: { email, userId } }
    );
  },

  async setShippingAddress({ store, cartId, address, cookie }) {
    await executeGraphQL(
      `mutation MarketplaceSetRestaurantDelivery($cartId: ID!, $data: ActiveCartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      {
        cartId,
        data: {
          orderType: 'delivery',
          email: address.email,
          customerName: `${address.firstName} ${address.lastName}`.trim(),
          customerPhone: address.phone,
          deliveryAddress: address.address1,
          deliveryCity: address.city,
          deliveryState: address.province,
          deliveryZip: address.postalCode,
          deliveryCountryCode: address.countryCode.toUpperCase(),
        },
      }
    );
    const raw = await fetchRawCart(store, cartId, cookie);
    return normalizeCart(raw);
  },

  async updateCartFulfillment({
    store,
    cartId,
    orderType,
    email,
    customerName,
    customerPhone,
    deliveryAddress,
    deliveryAddress2,
    deliveryCity,
    deliveryState,
    deliveryZip,
    deliveryCountryCode,
    cookie,
    ctoken,
  }) {
    const data = {
      orderType,
      ...(email !== undefined ? { email } : {}),
      ...(customerName !== undefined ? { customerName } : {}),
      ...(customerPhone !== undefined ? { customerPhone } : {}),
      ...(deliveryAddress !== undefined ? { deliveryAddress } : {}),
      ...(deliveryAddress2 !== undefined ? { deliveryAddress2 } : {}),
      ...(deliveryCity !== undefined ? { deliveryCity } : {}),
      ...(deliveryState !== undefined ? { deliveryState } : {}),
      ...(deliveryZip !== undefined ? { deliveryZip } : {}),
      ...(deliveryCountryCode !== undefined
        ? { deliveryCountryCode: deliveryCountryCode.toUpperCase() }
        : {}),
    };

    await executeGraphQL(
      `mutation MarketplaceUpdateRestaurantFulfillment($cartId: ID!, $data: ActiveCartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartId, data },
      ctoken
    );
    return fetchRawCart(store, cartId, cookie);
  },

  async buildCheckoutLink({ store, cartId }) {
    return `${store.baseUrl}/checkout?cart_id=${encodeURIComponent(cartId)}`;
  },

  async getAvailablePaymentMethods({ store, cookie, ctoken }) {
    const result = await executeGraphQL(
      `query MarketplaceRestaurantPaymentMethods {
        activeCartPaymentProviders { id name code isInstalled }
      }`,
      store.endpoint,
      cookie || '',
      {},
      ctoken
    );
    return result.data?.activeCartPaymentProviders || [];
  },

  async initiatePaymentSession({ store, cartId, paymentProviderCodeOrName, cookie }) {
    const providers = await this.getAvailablePaymentMethods({ store, regionId: '', cookie });
    const query = paymentProviderCodeOrName.toLowerCase();
    const provider = providers.find((candidate) =>
      candidate.code?.toLowerCase().includes(query) ||
      candidate.name?.toLowerCase().includes(query) ||
      paymentProviderName(candidate.code || '').includes(query)
    );
    if (!provider) throw new Error(`Payment provider ${paymentProviderCodeOrName} is not available`);
    const result = await executeGraphQL(
      `mutation MarketplaceInitiateRestaurantPayment($cartId: ID!, $paymentProviderId: String!) {
        initiatePaymentSession(cartId: $cartId, paymentProviderId: $paymentProviderId) { id data amount }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartId, paymentProviderId: provider.code }
    );
    return result.data?.initiatePaymentSession;
  },

  async completeCart({ store, cartId, paymentSessionId, cookie }) {
    const result = await executeGraphQL(
      `mutation MarketplaceCompleteRestaurantCart($cartId: ID!, $paymentSessionId: ID) {
        completeActiveCart(cartId: $cartId, paymentSessionId: $paymentSessionId) {
          id orderNumber secretKey status total currencyCode
        }
      }`,
      store.endpoint,
      cartCookie(cookie, cartId),
      { cartId, paymentSessionId }
    );
    return result.data?.completeActiveCart;
  },

  async getStoreInfo({ store, cookie, ctoken }): Promise<StoreInfo> {
    let result: any;
    try {
      result = await executeGraphQL(
        `query MarketplaceRestaurantInfo {
          storeSettings {
            id
            name
            currencyCode
            locale
            countryCode
            address
            deliveryEnabled
            deliveryPostalCodes
            deliveryFee
            deliveryMinimum
            pickupDiscount
            estimatedDelivery
            estimatedPickup
            logoIcon
            logoColor
            paymentProviders { provider publishableKey }
          }
          activeCartPaymentProviders { id name code isInstalled }
        }`,
        store.endpoint,
        cookie || '',
        {},
        ctoken
      );
    } catch {
      // Older Restaurant deployments may expose fulfillment settings without
      // the newer branding/payment virtual fields.
      try {
        result = await executeGraphQL(
          `query MarketplaceRestaurantLegacyFulfillmentInfo {
            storeSettings {
              id
              name
              currencyCode
              locale
              countryCode
              address
              deliveryEnabled
              deliveryPostalCodes
              deliveryFee
              deliveryMinimum
              pickupDiscount
              estimatedDelivery
              estimatedPickup
            }
            activeCartPaymentProviders { id name code isInstalled }
          }`,
          store.endpoint,
          cookie || '',
          {},
          ctoken
        );
      } catch {
        result = await executeGraphQL(
          `query MarketplaceRestaurantLegacyInfo {
            storeSettings { id name currencyCode countryCode address }
            activeCartPaymentProviders { id name code isInstalled }
          }`,
          store.endpoint,
          cookie || '',
          {},
          ctoken
        );
      }
    }

    const settings = result.data?.storeSettings;
    const publicProviderConfigs = new Map(
      (settings?.paymentProviders || []).map((provider: any) => [provider.provider, provider])
    );
    const providers = (result.data?.activeCartPaymentProviders || [])
      .filter((provider: any) => provider.isInstalled)
      .map((provider: any) => {
        const providerName = paymentProviderName(provider.code || provider.name);
        const publicConfig = publicProviderConfigs.get(providerName) as any;
        return publicConfig || { provider: providerName };
      });

    return {
      id: settings?.id || store.id,
      name: settings?.name || new URL(store.baseUrl).hostname,
      logoIcon: settings?.logoIcon || undefined,
      logoColor: settings?.logoColor || undefined,
      address: settings?.address || undefined,
      countryCode: settings?.countryCode || undefined,
      paymentProviders: providers,
      deliveryEnabled: typeof settings?.deliveryEnabled === 'boolean'
        ? settings.deliveryEnabled
        : undefined,
      deliveryPostalCodes: Array.isArray(settings?.deliveryPostalCodes)
        ? settings.deliveryPostalCodes.map(String)
        : undefined,
      deliveryFee: settings?.deliveryFee ?? undefined,
      deliveryMinimum: settings?.deliveryMinimum ?? undefined,
      pickupDiscount: typeof settings?.pickupDiscount === 'number'
        ? settings.pickupDiscount
        : undefined,
      estimatedDelivery: settings?.estimatedDelivery || undefined,
      estimatedPickup: settings?.estimatedPickup || undefined,
      locale: settings?.locale || undefined,
    };
  },

  async getAvailableCountries({ store, cookie, ctoken }) {
    const result = await executeGraphQL(
      `query MarketplaceRestaurantCountry { storeSettings { countryCode currencyCode } }`,
      store.endpoint,
      cookie || '',
      {},
      ctoken
    );
    const code = (result.data?.storeSettings?.countryCode || 'US').toLowerCase();
    return [{
      code,
      name: countryName(code),
      currency: result.data?.storeSettings?.currencyCode || 'USD',
    }];
  },

  async generateProductUI({ store, storeId, product, countryCode }) {
    return generateRestaurantProductUI({ storeId, storeUrl: store.baseUrl, product, countryCode });
  },

  async generateCartUI({ store, cartId, storeInfo, cartData }) {
    return generateRestaurantCartUI({
      storeId: store.id,
      cartId,
      cart: cartData,
      storeInfo,
      storeUrl: store.baseUrl,
    });
  },

  async generateLoginUI({ storeId, email, message, cartId, addressData }) {
    return generateOpenFrontLoginUI({ storeId, email, message, cartId, addressData });
  },

  async generateEmailConflictUI(params) {
    return generateOpenFrontEmailConflictUI(params);
  },
};

export default restaurantAdapter;
