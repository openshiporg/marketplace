import type { PlatformAdapter, Product, Cart } from '../types';
import { executeGraphQL } from '../../tools/utils';
import { randomBytes } from 'crypto';
import { generateOpenFrontCartUI, generateOpenFrontLoginUI, generateOpenFrontEmailConflictUI } from './ui';

const openfrontAdapter: PlatformAdapter = {
  async searchProducts({ store, countryCode, limit = 10, cookie, ctoken }): Promise<Product[]> {
    const query = `
      query SearchProducts {
        products(take: ${limit}) {
          id
          title
          handle
          thumbnail
          productVariants {
            id
            title
            sku
            inventoryQuantity
            allowBackorder
            prices(where: { region: { countries: { some: { iso2: { equals: "${countryCode.toLowerCase()}" } } } } }) {
              amount
              currency { code }
            }
            productOptionValues {
              value
              productOption { id title }
            }
          }
        }
      }
    `;

    const result = await executeGraphQL(query, store.endpoint, cookie || '', undefined, ctoken);
    const products = result.data?.products || [];

    // Helper to convert local image paths to full URLs
    const normalizeImageUrl = (imagePath: string | null | undefined): string | null => {
      if (!imagePath) return null;
      // If it starts with /, it's a local path - prepend store baseUrl
      if (imagePath.startsWith('/')) {
        return `${store.baseUrl}${imagePath}`;
      }
      // Otherwise it's already a full URL
      return imagePath;
    };

    return products.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: normalizeImageUrl(p.thumbnail),
      variants: (p.productVariants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        price: (v.prices?.[0]?.amount ?? 0),
        currency: (v.prices?.[0]?.currency?.code ?? 'USD'),
        inventoryQuantity: v.inventoryQuantity ?? 0,
        allowBackorder: !!v.allowBackorder,
        options: (v.productOptionValues || []).map((ov: any) => ({
          name: ov.productOption?.title || '',
          value: ov.value
        })),
      })),
    }));
  },

  async getProduct({ store, productId, countryCode, cookie, ctoken }) {
    const query = `
      query GetProduct($id: ID!) {
        product(where: { id: $id }) {
          id
          title
          handle
          description
          thumbnail
          productVariants {
            id
            title
            sku
            inventoryQuantity
            allowBackorder
            prices(where: { region: { countries: { some: { iso2: { equals: "${countryCode.toLowerCase()}" } } } } }) {
              amount
              currency { code }
            }
            productOptionValues { value productOption { id title } }
          }
        }
      }
    `;
    const result = await executeGraphQL(query, store.endpoint, cookie || '', { id: productId }, ctoken);
    const p = result.data?.product;
    if (!p) throw new Error('Product not found');

    // Helper to convert local image paths to full URLs
    const normalizeImageUrl = (imagePath: string | null | undefined): string | null => {
      if (!imagePath) return null;
      // If it starts with /, it's a local path - prepend store baseUrl
      if (imagePath.startsWith('/')) {
        return `${store.baseUrl}${imagePath}`;
      }
      // Otherwise it's already a full URL
      return imagePath;
    };

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description,
      thumbnail: normalizeImageUrl(p.thumbnail),
      variants: (p.productVariants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        price: (v.prices?.[0]?.amount ?? 0),
        currency: (v.prices?.[0]?.currency?.code ?? 'USD'),
        inventoryQuantity: v.inventoryQuantity ?? 0,
        allowBackorder: !!v.allowBackorder,
        options: (v.productOptionValues || []).map((ov: any) => ({ name: ov.productOption?.title || '', value: ov.value }))
      })),
    };
  },

  async createCart({ store, countryCode, cookie, ctoken }): Promise<Cart> {
    // First get region for country code
    const regionQuery = `
      query {
        regions(where: { countries: { some: { iso2: { equals: "${countryCode.toLowerCase()}" } } } }) {
          id
          name
          currency { code }
        }
      }
    `;
    const regionResult = await executeGraphQL(regionQuery, store.endpoint, cookie || '', undefined, ctoken);
    const region = regionResult.data?.regions?.[0];
    if (!region) {
      throw new Error(`No region found for country code: ${countryCode}`);
    }

    // Create cart with region connected
    const createCartMutation = `
      mutation CreateCart($data: CartCreateInput!) {
        createCart(data: $data) {
          id
          email
          type
          lineItems {
            id
            quantity
            productVariant {
              id
              title
              product { thumbnail title }
              prices {
                amount
                currency { code }
                calculatedPrice {
                  calculatedAmount
                  originalAmount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;
    const cartResult = await executeGraphQL(createCartMutation, store.endpoint, cookie || '', {
      data: { region: { connect: { id: region.id } } }
    }, ctoken);
    const newCart = cartResult.data?.createCart;

    return {
      id: newCart?.id,
      lineItems: (newCart?.lineItems || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        variantId: item.productVariant?.id,
        productTitle: item.productVariant?.product?.title || item.productVariant?.title || '',
        price: item.productVariant?.prices?.[0]?.amount ?? 0,
      })),
      subtotal: 0,
      total: 0,
      currency: region.currency.code,
    };
  },

  async addToCart({ store, cartId, variantId, quantity, cookie, ctoken }) {
    const mutation = `
      mutation AddToCart($cartId: ID!, $data: CartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id }
      }
    `;
    await executeGraphQL(
      mutation,
      store.endpoint,
      cookie || '',
      { cartId, data: { lineItems: { create: [{ productVariant: { connect: { id: variantId } }, quantity }] } } },
      ctoken
    );
    return this.getCart({ store, cartId, cookie, ctoken });
  },

  async getCart({ store, cartId, cookie, ctoken }) {
    const query = `query GetCart($cartId: ID!) { activeCart(cartId: $cartId) }`;
    const result = await executeGraphQL(query, store.endpoint, cookie || '', { cartId }, ctoken);
    const cart = result.data?.activeCart;
    return {
      id: cart?.id,
      lineItems: (cart?.lineItems || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        variantId: item.productVariant?.id,
        productTitle: item.productVariant?.product?.title || item.productVariant?.title || '',
        price: item.productVariant?.prices?.[0]?.amount ?? 0,
      })),
      subtotal: cart?.subtotal ?? 0,
      total: cart?.total ?? 0,
      currency: cart?.region?.currency?.code || 'USD',
    } as Cart;
  },

  async authenticateUser({ store, email, password }) {
    const mutation = `
      mutation AuthenticateUser($email: String!, $password: String!) {
        authenticateUserWithPassword(email: $email, password: $password) {
          ... on UserAuthenticationWithPasswordSuccess {
            sessionToken
            item { id email activeCartId }
          }
          ... on UserAuthenticationWithPasswordFailure {
            message
            __typename
          }
        }
      }
    `;
    const result = await executeGraphQL(mutation, store.endpoint, '', { email, password });
    const auth = result.data?.authenticateUserWithPassword;
    if (!auth || auth.__typename === 'UserAuthenticationWithPasswordFailure') {
      const msg = auth?.message || 'Authentication failed';
      throw new Error(msg);
    }
    return {
      sessionToken: auth.sessionToken,
      user: {
        id: auth.item.id,
        email: auth.item.email,
        activeCartId: auth.item.activeCartId,
      },
    };
  },

	  async connectCartToUser({ store, cartId, userId, email, cookie, ctoken }) {
	    const mutation = `
	      mutation UpdateActiveCart($cartId: ID!, $data: CartUpdateInput!) {
	        updateActiveCart(cartId: $cartId, data: $data) { id }
	      }
	    `;
	    await executeGraphQL(
	      mutation,
	      store.endpoint,
	      cookie || '',
	      { cartId, data: { email, user: { connect: { id: userId } } } },
	      ctoken
	    );
	  },


  async setShippingAddress({ store, cartId, address, cookie, ctoken }) {
    const { email, firstName, lastName, address1, city, postalCode, countryCode, province, company, phone } = address;

    // Step 1: Try to detect authenticated user
    let currentUser: any = null;
    let sessionToken: string | undefined;
    try {
      const meQuery = `
        query Me { authenticatedItem { ... on User { id email } } }
      `;
      const userSessionToken = ctoken && !ctoken.startsWith('ctok_') ? ctoken : undefined;
      const meResult = await executeGraphQL(meQuery, store.endpoint, cookie || '', {}, userSessionToken);
      currentUser = meResult.data?.authenticatedItem;
    } catch (err) {
      // Not authenticated
    }

    // Step 2: If not authenticated, check if email has an account; if not, create guest and authenticate
    const addressData: any = {
      firstName,
      lastName,
      address1,
      address2: '',
      city,
      province,
      postalCode,
      phone,
      company,
      country: { connect: { iso2: countryCode.toLowerCase() } },
    };

    if (!currentUser) {
      const checkEmailQuery = `
        query CheckEmail($email: String!) {
          users(where: { email: { equals: $email, mode: insensitive }, hasAccount: { equals: true } }) { id email hasAccount }
        }
      `;
      const emailCheck = await executeGraphQL(checkEmailQuery, store.endpoint, cookie || '', { email }, ctoken);
      const existingUser = emailCheck.data?.users?.[0];
      if (existingUser && existingUser.hasAccount) {
        // Signal conflict to caller: the adapter will throw to let caller present login flow
        throw new Error('Unique constraint failed on the fields: (`email`)');
      }

      // Create guest user
      const randomPassword = randomBytes(16).toString('hex');
      const created = await executeGraphQL(
        `mutation CreateGuestUser($data: UserCreateInput!) { createUser(data: $data) { id email hasAccount name } }`,
        store.endpoint,
        cookie || '',
        { data: { email, hasAccount: false, name: `${firstName} ${lastName}`, password: randomPassword } },
        ctoken
      ).then(r => r.data);

      // Authenticate guest user to get session token
      const authRes = await executeGraphQL(
        `mutation AuthenticateGuestUser($email: String!, $password: String!) {
          authenticateUserWithPassword(email: $email, password: $password) {
            ... on UserAuthenticationWithPasswordSuccess { sessionToken item { id email } }
            ... on UserAuthenticationWithPasswordFailure { message __typename }
          }
        }`,
        store.endpoint,
        cookie || '',
        { email, password: randomPassword },
        ctoken
      ).then(r => r.data);
      if (authRes.authenticateUserWithPassword.__typename === 'UserAuthenticationWithPasswordFailure') {
        throw new Error('Authentication failed');
      }
      sessionToken = authRes.authenticateUserWithPassword.sessionToken;
      addressData.user = { connect: { id: created.createUser.id } };
      currentUser = { id: created.createUser.id, email: created.createUser.email };
    } else {
      addressData.user = { connect: { id: currentUser.id } };
    }

    // Step 3: Create address
    const createdAddress = await executeGraphQL(
      `mutation CreateAddress($data: AddressCreateInput!) {
        createAddress(data: $data) { id user { id } country { iso2 } }
      }`,
      store.endpoint,
      cookie || '',
      { data: addressData },
      sessionToken || ctoken
    ).then(r => {
      return r.data?.createAddress;
    }).catch(err => {
      throw err;
    });

    // Step 4: Update cart with email, addresses, and user
    await executeGraphQL(
      `mutation UpdateActiveCart($cartId: ID!, $data: CartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id }
      }`,
      store.endpoint,
      cookie || '',
      {
        cartId,
        data: {
          email,
          shippingAddress: { connect: { id: createdAddress.id } },
          billingAddress: { connect: { id: createdAddress.id } },
          user: { connect: { id: currentUser.id } },
        },
      },
      sessionToken || ctoken
    ).then(r => {
      return r;
    }).catch(err => {
      throw err;
    });

    // Step 5: Return normalized cart
    return this.getCart({ store, cartId, cookie, ctoken });
  },

  async getAvailableCountries({ store, cookie, ctoken }) {
    const query = `
      query {
        regions {
          id
          name
          currency { code }
          countries { id iso2 iso3 displayName numCode }
        }
      }
    `;
    const result = await executeGraphQL(query, store.endpoint, cookie || '', undefined, ctoken);
    const countries = result.data?.regions?.flatMap((region: any) =>
      region.countries.map((country: any) => ({
        code: country.iso2.toLowerCase(),
        name: country.displayName,
        currency: region.currency.code,
      }))
    ) || [];
    countries.sort((a: any, b: any) => a.name.localeCompare(b.name));
    return countries;
  },

  async getCartRaw({ store, cartId, cookie, ctoken }) {
    const q = `query GetCart($cartId: ID!) { activeCart(cartId: $cartId) }`;
    const res = await executeGraphQL(q, store.endpoint, cookie || '', { cartId }, ctoken);
    return res.data?.activeCart;
  },

  async getCartShippingOptions({ store, cartId, cookie, ctoken }) {
    const q = `
      query GetCart($cartId: ID!) {
        activeCart(cartId: $cartId)
        activeCartShippingOptions(cartId: $cartId) {
          id
          name
          amount
          calculatedAmount
          isTaxInclusive
          priceType
          data
        }
      }
    `;
    const res = await executeGraphQL(q, store.endpoint, cookie || '', { cartId }, ctoken);
    return res.data?.activeCartShippingOptions || [];
  },

  async setShippingMethod({ store, cartId, shippingMethodId, cookie, ctoken }) {
    const mutation = `
      mutation AddShippingMethod($cartId: ID!, $shippingMethodId: ID!) {
        addActiveCartShippingMethod(cartId: $cartId, shippingMethodId: $shippingMethodId) {
          id
          shippingMethods { id price shippingOption { id name } }
        }
      }
    `;
    const res = await executeGraphQL(mutation, store.endpoint, cookie || '', { cartId, shippingMethodId }, ctoken);
    return res.data?.addActiveCartShippingMethod;
  },

  async updateCartItemQuantity({ store, cartId, lineItemId, quantity, cookie, ctoken }) {
    const mutation = `
      mutation UpdateLineItem($cartId: ID!, $lineId: ID!, $quantity: Int!) {
        updateActiveCartLineItem(cartId: $cartId, lineId: $lineId, quantity: $quantity) {
          id
          lineItems { id quantity productVariant { id title prices { amount currency { code } } } }
        }
      }
    `;
    const res = await executeGraphQL(mutation, store.endpoint, cookie || '', { cartId, lineId: lineItemId, quantity }, ctoken);
    return res.data?.updateActiveCartLineItem;
  },

  async removeCartItem({ store, cartId, lineItemId, cookie, ctoken }) {
    const mutation = `
      mutation RemoveCartItem($cartId: ID!, $data: CartUpdateInput!) {
        updateActiveCart(cartId: $cartId, data: $data) { id lineItems { id quantity productVariant { id title prices { amount currency { code } } } } }
      }
    `;
    const res = await executeGraphQL(
      mutation,
      store.endpoint,
      cookie || '',
      { cartId, data: { lineItems: { disconnect: [{ id: lineItemId }] } } },
      ctoken
    );
    return res.data?.updateActiveCart;
  },

  async getAvailablePaymentMethods({ store, regionId, cookie, ctoken }) {
    const q = `
      query ListPaymentProviders($regionId: ID!) {
        activeCartPaymentProviders(regionId: $regionId) { id name code isInstalled }
      }
    `;
    const res = await executeGraphQL(q, store.endpoint, cookie || '', { regionId }, ctoken);
    return res.data?.activeCartPaymentProviders || [];
  },

  async initiatePaymentSession({ store, cartId, paymentProviderCodeOrName, cookie, ctoken }) {
    // Get cart for region and existing sessions
    const cart = await this.getCartRaw({ store, cartId, cookie, ctoken });
    const regionId = cart?.region?.id;
    if (!regionId) throw new Error('Cart or region not found');

    const providers = await this.getAvailablePaymentMethods({ store, regionId, cookie, ctoken });
    const lower = paymentProviderCodeOrName.toLowerCase();
    const matched = providers.find(p => p.code?.toLowerCase().includes(lower) || p.name?.toLowerCase().includes(lower));
    if (!matched) throw new Error(`Payment provider ${paymentProviderCodeOrName} not found in active cart payment providers`);

    const mutation = `
      mutation InitiatePaymentSession($cartId: ID!, $paymentProviderId: String!) {
        initiatePaymentSession(cartId: $cartId, paymentProviderId: $paymentProviderId) { id data amount }
      }
    `;
    const res = await executeGraphQL(mutation, store.endpoint, cookie || '', { cartId, paymentProviderId: matched.code }, ctoken);
    return res.data?.initiatePaymentSession;
  },

  async completeCart({ store, cartId, paymentSessionId, cookie, ctoken }) {
    const mutation = `
      mutation CompleteActiveCart($cartId: ID!, $paymentSessionId: ID) {
        completeActiveCart(cartId: $cartId, paymentSessionId: $paymentSessionId)
      }
    `;
    const res = await executeGraphQL(mutation, store.endpoint, cookie || '', { cartId, paymentSessionId }, ctoken);
    return res.data?.completeActiveCart;
  },

  async getStoreInfo({ store, cookie, ctoken }) {
    const q = `
      query GetStore { stores(take: 1) { id name logoIcon logoColor paymentProviders { provider publishableKey } } }
    `;
    const res = await executeGraphQL(q, store.endpoint, cookie || '', {}, ctoken);
    const s = res.data?.stores?.[0];
    return s || { id: store.id, name: new URL(store.baseUrl).hostname };
  },

  async buildCheckoutLink({ store, cartId, countryCode }) {
    return `${store.baseUrl}/${countryCode.toLowerCase()}/account/checkout-link?cartId=${cartId}`;
  },

  // UI Generation Methods
  async generateCartUI({ store, cartId, storeInfo, cartData, shippingOptions }) {
    return generateOpenFrontCartUI({
      storeId: store.id,
      cartId,
      cart: cartData,
      storeInfo: { ...storeInfo, url: store.baseUrl },
      shippingOptions
    });
  },

  async generateLoginUI({ store, storeId, email, message, cartId, addressData }) {
    return generateOpenFrontLoginUI({
      storeId,
      email,
      message,
      cartId,
      addressData
    });
  },

  async generateEmailConflictUI({ store, storeId, email, cartId, firstName, lastName, address1, city, postalCode, countryCode, province, company, phone, storeName, checkoutUrl }) {
    return generateOpenFrontEmailConflictUI({
      storeId,
      email,
      cartId,
      firstName,
      lastName,
      address1,
      city,
      postalCode,
      countryCode,
      province,
      company,
      phone,
      storeName,
      checkoutUrl
    });
  },
};

export default openfrontAdapter;

