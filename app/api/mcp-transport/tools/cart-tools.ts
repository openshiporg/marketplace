import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from './utils';
import { getPlatformAdapter } from '../adapters';
import { parseStoreConfigs } from '../types/store-config';

async function resolveAdapter(storeId: string, customConfig?: any[]) {
  const stores = parseStoreConfigs(customConfig);
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error(`Unknown store: ${storeId}. Available stores: ${stores.map(s => s.id).join(', ')}`);
  const adapter = await getPlatformAdapter(store);
  return { store, adapter } as const;
}


export const cartTools: Tool[] = [
  {
    name: 'getOrCreateCart',
    description: 'Get existing active cart or create a new one. IMPORTANT: Always use this instead of creating a cart directly. This tool automatically checks if a cart already exists for this store (from the cart context provided in the system prompt) and reuses it if active. Only creates a new cart if no active cart exists.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        countryCode: {
          type: 'string',
          description: 'Country code (e.g., "us", "ca", "gb")'
        }
      },
      required: ['storeId', 'countryCode']
    }
  },
  {
    name: 'createCart',
    description: 'DEPRECATED: Use getOrCreateCart instead. This creates a new cart without checking for existing carts.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        countryCode: {
          type: 'string',
          description: 'Country code (e.g., "us", "ca", "gb")'
        },
      },
      required: ['storeId', 'countryCode']
    }
  },
  {
    name: 'getAvailablePaymentMethods',
    description: 'Get list of available payment methods for a region. Returns payment providers with id, name, code, and installation status. Use this before showing payment options to users.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        regionId: {
          type: 'string',
          description: 'Region ID to get payment methods for'
        }
      },
      required: ['storeId', 'regionId']
    }
  },
  {
    name: 'viewCart',
    description: 'View cart with interactive UI showing items, prices, quantities, and totals. This returns a visual cart interface that users can interact with.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
      },
      required: ['storeId', 'cartId']
    }
  },
  {
    name: 'getCart',
    description: 'Get cart data as JSON (for programmatic access, not for display to users)',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
      },
      required: ['storeId', 'cartId']
    }
  },
  {
    name: 'addToCart',
    description: 'Add a product variant to the cart',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
        variantId: {
          type: 'string',
          description: 'Product variant ID to add'
        },
        quantity: {
          type: 'number',
          description: 'Quantity to add (default: 1)'
        },
      },
      required: ['storeId', 'cartId', 'variantId', 'quantity']
    }
  },
  {
    name: 'updateCartItem',
    description: 'Update quantity of an item in the cart',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
        lineItemId: {
          type: 'string',
          description: 'Line item ID to update'
        },
        quantity: {
          type: 'number',
          description: 'New quantity'
        },
      },
      required: ['storeId', 'cartId', 'lineItemId', 'quantity']
    }
  },
  {
    name: 'removeCartItem',
    description: 'Remove an item from the cart',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
        lineItemId: {
          type: 'string',
          description: 'Line item ID to remove'
        },
      },
      required: ['storeId', 'cartId', 'lineItemId']
    }
  },
  {
    name: 'setShippingAddress',
    description: `Set shipping address and email for the cart (creates guest user if needed).

CRITICAL WORKFLOW:
1. When user requests to add/set shipping address, you MUST first ask them for ALL required information:
   - Email address
   - First name and last name
   - Street address
   - City, state/province, and postal/ZIP code
   - Country
   - Phone number
   - Company (optional)

2. ONLY call this tool AFTER the user has provided their actual information. DO NOT call this tool immediately.

3. NEVER use sample, placeholder, or test data (like "sample@example.com", "Sample User", "123 Sample St", etc.)

4. If the email already has an account, this will return an email conflict UI with options for the user to handle it.`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
        email: {
          type: 'string',
          description: 'Customer email'
        },
        firstName: {
          type: 'string',
          description: 'First name'
        },
        lastName: {
          type: 'string',
          description: 'Last name'
        },
        address1: {
          type: 'string',
          description: 'Address line 1'
        },
        city: {
          type: 'string',
          description: 'City'
        },
        postalCode: {
          type: 'string',
          description: 'Postal/ZIP code'
        },
        countryCode: {
          type: 'string',
          description: 'Country code (e.g., "us", "ca", "gb")'
        },
        province: {
          type: 'string',
          description: 'State or Province'
        },
        company: {
          type: 'string',
          description: 'Company name'
        },
        phone: {
          type: 'string',
          description: 'Phone number'
        },
      },
      required: ['storeId', 'cartId', 'email', 'firstName', 'lastName', 'address1', 'city', 'postalCode', 'countryCode', 'province', 'company', 'phone']
    }
  },
  {
    name: 'setShippingMethod',
    description: 'Set the shipping method for the cart. Call this after the user selects their preferred shipping option.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        },
        shippingMethodId: {
          type: 'string',
          description: 'ID of the shipping method to set (from activeCartShippingOptions)'
        },
      },
      required: ['storeId', 'cartId', 'shippingMethodId']
    }
  },
  {
    name: 'getCheckoutLink',
    description: 'Generate a secure checkout link for cart completion. Use this tool whenever the user indicates they want to “check out on the store” or “go to the store website.” Return only the checkout URL as plain text (no markdown links). WARNING: For best customer experience, ensure cart has: 1) Products added, 2) Shipping address set, 3) Shipping method selected. The checkout page will guide the customer through any remaining steps.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID to create checkout link for'
        },
        countryCode: {
          type: 'string',
          description: 'Country code for the checkout URL (e.g., "us", "ca", "gb")'
        },
      },
      required: ['storeId', 'cartId', 'countryCode']
    }
  },
  {
    name: 'validateCartForCheckout',
    description: 'PROACTIVE: Call this BEFORE initiating payment to check if cart is ready for checkout. Returns what is missing (items, address, shipping method, etc.) so you can guide the user to complete those steps first.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID'
        }
      },
      required: ['storeId', 'cartId']
    }
  },
  {
    name: 'initiatePaymentSession',
    description: 'Initiate a payment session for Stripe or PayPal. Returns interactive UI for completing payment (Stripe card form or PayPal button). Call this when user wants to pay with a specific payment provider.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID to initiate payment for'
        },
        paymentProvider: {
          type: 'string',
          description: 'Payment provider code (e.g., "stripe", "paypal")'
        }
      },
      required: ['storeId', 'cartId', 'paymentProvider']
    }
  },
  {
    name: 'completeCart',
    description: 'Complete the cart and create an order after payment has been confirmed. This is called automatically by the payment UI after successful Stripe/PayPal payment. Returns the completed order with ID and redirect URL.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID to complete'
        },
        paymentSessionId: {
          type: 'string',
          description: 'Payment session ID from the payment confirmation (required for tracking payment)'
        }
      },
      required: ['storeId', 'cartId', 'paymentSessionId']
    }
  },
  {
    name: 'loginUser',
    description: `Show login UI for user authentication.

IMPORTANT: Call this tool when:
- User says they will provide login credentials (e.g., "I'll provide you my login credentials")
- User wants to sign in or log in
- Their email already has an account

DO NOT ask for credentials in text. Always show the login form UI so the user can securely enter their password.

Returns interactive login form that handles authentication and session management.`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        email: {
          type: 'string',
          description: 'Pre-fill email address if known'
        },
        message: {
          type: 'string',
          description: 'Optional message to show user (e.g., "An account with this email already exists. Please login.")'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID to connect after successful login'
        },
        addressData: {
          type: 'object',
          description: 'Address data to apply after successful login',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            address1: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            countryCode: { type: 'string' },
            province: { type: 'string' },
            company: { type: 'string' },
            phone: { type: 'string' }
          },
          required: ['firstName', 'lastName', 'address1', 'city', 'postalCode', 'countryCode', 'province', 'company', 'phone'],
          additionalProperties: false
        }
      },
      required: ['storeId', 'email', 'message', 'cartId', 'addressData']
    }
  },
  {
    name: 'authenticateUser',
    description: 'Authenticate a user with email and password. This is called automatically when the user submits the login form. DO NOT call this tool directly - it is triggered by the loginUser UI form submission.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
        },
        email: {
          type: 'string',
          description: 'User email'
        },
        password: {
          type: 'string',
          description: 'User password'
        },
        cartId: {
          type: 'string',
          description: 'Cart ID to connect after successful login'
        },
        addressData: {
          type: 'object',
          description: 'Address data to apply after successful login',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            address1: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            countryCode: { type: 'string' },
            province: { type: 'string' },
            company: { type: 'string' },
            phone: { type: 'string' }
          },
          required: ['firstName', 'lastName', 'address1', 'city', 'postalCode', 'countryCode', 'province', 'company', 'phone'],
          additionalProperties: false
        }
      },
      required: ['storeId', 'email', 'password', 'cartId', 'addressData']
    }
  }
];

export async function handleCartTools(name: string, args: any, cookie: string, dataHasChanged: { value: boolean }, ctoken?: string, cartIds?: Record<string, string>, customMarketplaceConfig?: any[]) {
  if (name === 'getAvailablePaymentMethods') {
    const { storeId, regionId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const paymentMethods = await adapter.getAvailablePaymentMethods({ store, regionId, cookie, ctoken });

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            paymentMethods,
            totalMethods: paymentMethods.length,
            storeId,
            regionId
          }, null, 2),
        }],
      }
    };
  }

  if (name === 'getOrCreateCart') {
    const { storeId, countryCode } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);

    const existingCartId = cartIds?.[storeId];

    if (existingCartId) {
      try {
        const existingCart = await adapter.getCartRaw({ store, cartId: existingCartId, cookie, ctoken });
        if (existingCart && existingCart.id && existingCart.status !== 'completed') {
          return {
            jsonrpc: '2.0',
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  cart: existingCart,
                  countryCode,
                  storeId,
                  message: `Using existing cart ${existingCart.id}. Cart has ${existingCart.lineItems?.length || 0} items.`,
                  instruction: 'Cart already exists and is active. Use this cart ID for cart operations.',
                  isExistingCart: true,
                }, null, 2),
              }],
            }
          };
        }
      } catch (e) {
        // Existing cart fetch failed, will create new one
      }
    }

    // Create new cart via adapter then fetch raw cart for UI parity
    const created = await adapter.createCart({ store, countryCode, cookie, ctoken });
    const cart = await adapter.getCartRaw({ store, cartId: created.id, cookie, ctoken });

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            cart,
            countryCode,
            storeId,
            message: `Created new cart ${cart.id} for ${countryCode.toUpperCase()}.`,
            instruction: 'Use this cart ID with other cart operations (addToCart, setShippingAddress, etc.)',
            isNewCart: true,
            __clientAction: { type: 'saveCartId', storeId, cartId: cart.id }
          }, null, 2),
        }],
      }
    };
  }

  if (name === 'createCart') {
    const { storeId, countryCode } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const cart = await adapter.createCart({ store, countryCode, cookie, ctoken });

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            cart,
            countryCode,
            storeId,
            message: `Cart created successfully for ${countryCode.toUpperCase()}. Cart ID: ${cart.id}`,
            instruction: 'Use this cart ID with other cart operations (addToCart, setShippingAddress, etc.)',
            __clientAction: { type: 'saveCartId', storeId, cartId: cart.id }
          }, null, 2),
        }],
      }
    };
  }

  if (name === 'viewCart') {
    const { storeId, cartId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);

    // Fetch store details using adapter
    const storeInfo = await adapter.getStoreInfo({ store, cookie, ctoken });

    // Fetch cart data and shipping options using adapter
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });
    const shippingOptions = await adapter.getCartShippingOptions({ store, cartId, cookie, ctoken });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Generate HTML using adapter UI method if available
    let htmlContent: string;
    if (adapter.generateCartUI) {
      htmlContent = await adapter.generateCartUI({
        store,
        cartId,
        storeInfo,
        cartData: cart,
        shippingOptions,
        cookie,
        ctoken
      });
    } else {
      throw new Error('Cart UI generation not supported for this platform');
    }

    // Use proper MCP UI format
    const uiResource = createUIResource({
      uri: `ui://marketplace/cart/${cartId}?store=${encodeURIComponent(storeId)}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  if (name === 'getCart') {
    const { storeId, cartId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ cart, storeId }, null, 2) }],
      }
    };
  }

  if (name === 'addToCart') {
    const { storeId, cartId, variantId, quantity = 1 } = args;

    if (quantity <= 0) {
      return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid quantity', message: 'Quantity must be greater than 0', variantId, attemptedQuantity: quantity }, null, 2) }] } };
    }

    const MAX_QUANTITY = 1000;
    if (quantity > MAX_QUANTITY) {
      return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify({ error: 'Quantity too large', message: `Quantity cannot exceed ${MAX_QUANTITY} items per line. For bulk orders, please contact support.`, variantId, attemptedQuantity: quantity, maxAllowed: MAX_QUANTITY }, null, 2) }] } };
    }

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);

    let finalCartId = cartId;
    if (!finalCartId) {
      const existingId = cartIds?.[storeId];
      if (existingId) {
        finalCartId = existingId;
      } else {
        const created = await adapter.createCart({ store, countryCode: args.countryCode || 'us', cookie, ctoken });
        finalCartId = created.id;
      }
    }

    await adapter.addToCart({ store, cartId: finalCartId, variantId, quantity, cookie, ctoken });
    const cart = await adapter.getCartRaw({ store, cartId: finalCartId, cookie, ctoken });

    dataHasChanged.value = true;

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ cart, message: `Added ${quantity} item(s) to cart`, addedVariantId: variantId, newItemCount: cart?.lineItems?.length || 0, storeId, __clientAction: { type: 'saveCartId', storeId, cartId: finalCartId } }, null, 2) }],
      }
    };
  }

  if (name === 'setShippingAddress') {
    const { storeId, cartId, email, firstName, lastName, address1, city, postalCode, countryCode, province, company, phone } = args;

    try {
      const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
      await adapter.setShippingAddress({
        store,
        cartId,
        address: { firstName, lastName, address1, city, postalCode, countryCode, province, company, phone, email },
        cookie,
        ctoken,
      });
      const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });
      dataHasChanged.value = true;
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              cart,
              message: 'Shipping address set successfully',
              email,
              storeId
            }, null, 2),
          }],
        }
      };

    } catch (error: any) {
      // Check if this is a "user already exists" error
      const errorMessage = error.message || String(error);
      const errorStr = JSON.stringify(error).toLowerCase();


      if (errorMessage.includes('Unique constraint') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.toLowerCase().includes('unique') ||
          errorStr.includes('unique constraint') ||
          errorStr.includes('duplicate') ||
          errorStr.includes('email_unique')) {

        // Get store info and build platform-appropriate checkout link via adapter
        const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
        const storeInfo = await adapter.getStoreInfo({ store, cookie, ctoken });
        const storeName = storeInfo?.name || 'the store';
        const checkoutUrl = await adapter.buildCheckoutLink({ store, cartId, countryCode });

        // Generate HTML using adapter UI method if available
        let htmlContent: string;
        if (adapter.generateEmailConflictUI) {
          htmlContent = await adapter.generateEmailConflictUI({
            store,
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
        } else {
          throw new Error('Email conflict UI generation not supported for this platform');
        }

        const uiResource = createUIResource({
          uri: `ui://marketplace/email-conflict?email=${encodeURIComponent(email)}&store=${encodeURIComponent(storeId)}`,
          content: { type: 'rawHtml', htmlString: htmlContent },
          encoding: 'text',
        });

        return {
          jsonrpc: '2.0',
          result: {
            content: [uiResource],
          }
        };
      }

      // Other errors
      throw error;
    }
  }

  if (name === 'updateCartItem') {
    const { storeId, cartId, lineItemId, quantity } = args;

    if (quantity <= 0) {
      return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid quantity', message: 'Quantity must be greater than 0. To remove this item, use removeCartItem instead.', lineItemId, attemptedQuantity: quantity }, null, 2) }] } };
    }

    const MAX_QUANTITY = 1000;
    if (quantity > MAX_QUANTITY) {
      return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify({ error: 'Quantity too large', message: `Quantity cannot exceed ${MAX_QUANTITY} items per line. For bulk orders, please contact support.`, lineItemId, attemptedQuantity: quantity, maxAllowed: MAX_QUANTITY }, null, 2) }] } };
    }

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    await adapter.updateCartItemQuantity({ store, cartId, lineItemId, quantity, cookie, ctoken });
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });

    dataHasChanged.value = true;

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ cart, message: `Updated item quantity to ${quantity}`, updatedLineItemId: lineItemId, storeId }, null, 2) }],
      }
    };
  }

  if (name === 'removeCartItem') {
    const { storeId, cartId, lineItemId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    await adapter.removeCartItem({ store, cartId, lineItemId, cookie, ctoken });
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });

    dataHasChanged.value = true;

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ cart, message: 'Removed item from cart', removedLineItemId: lineItemId, newItemCount: cart?.lineItems?.length || 0, storeId }, null, 2) }],
      }
    };
  }

  if (name === 'setShippingMethod') {
    const { storeId, cartId, shippingMethodId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    await adapter.setShippingMethod({ store, cartId, shippingMethodId, cookie, ctoken });
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });
    const selectedMethod = cart?.shippingMethods?.find((m: any) => m.id === shippingMethodId);

    dataHasChanged.value = true;

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ cart, message: `Shipping method set to ${selectedMethod?.shippingOption?.name || 'selected option'}`, shippingMethodId, selectedShippingMethod: selectedMethod, storeId }, null, 2) }],
      }
    };
  }

  if (name === 'getCheckoutLink') {
    const { storeId, cartId, countryCode } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });

    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!cart.lineItems || cart.lineItems.length === 0) {
      warnings.push('⚠️  EMPTY CART: No products added to cart');
      recommendations.push('Use addToCart to add products before creating checkout link');
    }
    if (!cart.shippingAddress) {
      warnings.push('⚠️  MISSING SHIPPING: No shipping address set');
      recommendations.push('Use setShippingAddress to add customer details');
    }
    if (!cart.shippingMethods || cart.shippingMethods.length === 0) {
      warnings.push('⚠️  MISSING SHIPPING METHOD: No shipping method selected');
      recommendations.push('Use getShippingOptions and setShippingMethod');
    }
    if (!cart.email) {
      warnings.push('⚠️  MISSING EMAIL: No customer email provided');
      recommendations.push('Customer email is set via setShippingAddress');
    }

    const isComplete = warnings.length === 0;
    const status = isComplete ? 'READY' : 'INCOMPLETE';

    const checkoutUrl = await adapter.buildCheckoutLink({ store, cartId, countryCode });

    return {
      jsonrpc: '2.0',
      result: {
        content: [
          // Per project memory: return a plain URL (no markdown) by default
          { type: 'text', text: checkoutUrl },
          // Secondary payload with structured info (helpful for logs/diagnostics)
          { type: 'text', text: JSON.stringify({ checkoutUrl, cartId, status, isComplete, storeId, message: isComplete ? '✅ Checkout link ready! Cart is complete and ready for payment.' : '⚠️  Checkout link created, but cart needs completion. Customer will need to fill missing information.', warnings: warnings.length > 0 ? warnings : null, recommendations: recommendations.length > 0 ? recommendations : null, instructions: isComplete ? 'Cart is ready! Customer can proceed directly to payment.' : 'Customer will be guided through missing steps during checkout.', cartSummary: { itemCount: cart.lineItems?.length || 0, hasShippingAddress: !!cart.shippingAddress, hasShippingMethod: !!(cart.shippingMethods && cart.shippingMethods.length > 0), hasEmail: !!cart.email, total: cart.total || '$0.00' } }, null, 2) }
        ],
      }
    };
  }

  if (name === 'validateCartForCheckout') {
    const { storeId, cartId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });

    const issues: string[] = [];
    let isReady = true;

    if (!cart) {
      return { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify({ isReady: false, error: 'Cart not found', cartId }, null, 2) }] } };
    }

    if (!cart.lineItems || cart.lineItems.length === 0) { issues.push('Cart is empty - add products first'); isReady = false; }
    if (!cart.shippingAddress) { issues.push('No shipping address set - call setShippingAddress or user can update it in the cart UI'); isReady = false; }
    if (!cart.shippingMethods || cart.shippingMethods.length === 0) { issues.push('No shipping method selected - user needs to select shipping in cart UI or call setShippingMethod'); isReady = false; }

    return {
      jsonrpc: '2.0',
      result: {
        content: [{ type: 'text', text: JSON.stringify({ isReady, issues: issues.length > 0 ? issues : undefined, message: isReady ? 'Cart is ready for payment' : `Cart is not ready for checkout. ${issues.join('. ')}.`, cart: { hasItems: cart.lineItems?.length > 0, hasAddress: !!cart.shippingAddress, hasShippingMethod: !!(cart.shippingMethods && cart.shippingMethods.length > 0), subtotal: cart.subtotal } }, null, 2) }],
      }
    };
  }

  if (name === 'initiatePaymentSession') {
    const { storeId, cartId, paymentProvider } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);

    // Fetch cart and validate readiness
    const cart = await adapter.getCartRaw({ store, cartId, cookie, ctoken });
    if (!cart?.region?.id) {
      throw new Error('Cart or region not found');
    }

    const validationIssues: string[] = [];
    if (!cart.lineItems || cart.lineItems.length === 0) validationIssues.push('Cart is empty - add products first');
    if (!cart.shippingAddress) validationIssues.push('No shipping address set - call setShippingAddress first');
    if (!cart.shippingMethods || cart.shippingMethods.length === 0) validationIssues.push('No shipping method selected - user needs to select shipping in cart UI');

    if (validationIssues.length > 0) {
      // Return an error UI instead of plain text so the user can see it
      const errorHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-6">
          <div class="max-w-md mx-auto bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div class="ml-4">
                <h3 class="text-lg font-semibold text-red-800 mb-2">Cart Not Ready for Payment</h3>
                <p class="text-sm text-red-700 mb-4">Please complete the following before proceeding:</p>
                <ul class="list-disc list-inside space-y-2 text-sm text-red-700">
                  ${validationIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
                <div class="mt-6">
                  <button
                    onclick="window.parent.postMessage({ type: 'tool', messageId: 'view-cart-' + Date.now(), payload: { toolName: 'viewCart', params: { storeId: '${storeId}', cartId: '${cartId}' } } }, '*')"
                    class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Go Back to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          <script>
            // Auto-resize iframe
            const resizeObserver = new ResizeObserver((entries) => {
              entries.forEach((entry) => {
                window.parent.postMessage({
                  type: "ui-size-change",
                  payload: {
                    height: entry.contentRect.height,
                    width: entry.contentRect.width,
                  },
                }, "*");
              });
            });
            resizeObserver.observe(document.documentElement);
          </script>
        </body>
        </html>
      `;

      const errorResource = createUIResource({
        uri: `ui://marketplace/payment-error?cart=${cartId}`,
        content: { type: 'rawHtml', htmlString: errorHTML },
        encoding: 'text',
        adapters: {
          appsSdk: {
            enabled: true,
            config: {
              intentHandling: 'prompt',
            },
          },
        },
        metadata: {
          'openai/widgetDescription': 'Payment validation error',
          'openai/widgetPrefersBorder': true,
        },
      });

      return {
        jsonrpc: '2.0',
        result: { content: [errorResource] }
      };
    }



    // Reuse existing selected session if it matches provider
    const existingSessions = cart.paymentCollection?.paymentSessions || [];
    const matchedExisting = existingSessions.find((s: any) => s.isSelected && (s.paymentProvider?.code?.toLowerCase().includes(paymentProvider.toLowerCase()) || s.paymentProvider?.name?.toLowerCase().includes(paymentProvider.toLowerCase())) && s.status !== 'error');
    if (matchedExisting) {
      const storeInfo = await adapter.getStoreInfo({ store, cookie, ctoken });
      const providerConfig = storeInfo?.paymentProviders?.find?.((p: any) => p.provider === paymentProvider);
      const amountInCents = cart.rawTotal || 0;
      return {
        jsonrpc: '2.0',
        result: { content: [{ type: 'text', text: JSON.stringify({
          paymentProvider,
          paymentSession: { id: matchedExisting.id, data: matchedExisting.data, amount: amountInCents },
          cart,
          publishableKey: providerConfig?.publishableKey,
          storeId,
          message: `Payment session ready for ${paymentProvider}`,
          __clientAction: { type: 'renderPaymentUI', paymentProvider, cartId }
        }, null, 2) }] }
      };
    }

    // Initiate new session via adapter (adapter will resolve provider code)
    const session = await adapter.initiatePaymentSession({ store, cartId, paymentProviderCodeOrName: paymentProvider, cookie, ctoken });
    if (!session) throw new Error('Failed to initiate payment session');

    const storeInfo = await adapter.getStoreInfo({ store, cookie, ctoken });
    const providerConfig = storeInfo?.paymentProviders?.find?.((p: any) => p.provider === paymentProvider);

    return {
      jsonrpc: '2.0',
      result: { content: [{ type: 'text', text: JSON.stringify({
        paymentProvider,
        paymentSession: { id: session.id, data: session.data, amount: session.amount },
        cart,
        publishableKey: providerConfig?.publishableKey,
        storeId,
        message: `Payment session initiated for ${paymentProvider}`,
        __clientAction: { type: 'renderPaymentUI', paymentProvider, cartId }
      }, null, 2) }] }
    };
  }

  // END OF initiatePaymentSession

  if (name === 'completeCart') {
    const { storeId, cartId, paymentSessionId } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
    const order = await adapter.completeCart({ store, cartId, paymentSessionId, cookie, ctoken });

    if (!order) {
      throw new Error('Failed to complete cart');
    }

    const countryCode = order.shippingAddress?.country?.iso2?.toLowerCase();
    if (!countryCode) {
      throw new Error('No country code found in completed order');
    }

    const secretKeyParam = order.secretKey ? `?secretKey=${order.secretKey}` : '';
    const redirectUrl = `${store.baseUrl}/${countryCode}/order/confirmed/${order.id}${secretKeyParam}`;

    dataHasChanged.value = true;

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            orderId: order.id,
            redirectUrl,
            message: '✅ Order placed successfully!',
            clearCartId: true,
            storeId,
            order: {
              id: order.id,
              status: order.status,
              total: order.total,
              secretKey: order.secretKey
            }
          }, null, 2),
        }],
      }
    };
  }

  if (name === 'authenticateUser') {
    const { storeId, email, password, cartId, addressData } = args;

    try {
      const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);
      const auth = await adapter.authenticateUser({ store, email, password });
      const { sessionToken, user } = auth;

      let finalCartId = user.activeCartId;
      if (cartId && cartId !== user.activeCartId) {
        try {
          await adapter.connectCartToUser({ store, cartId, userId: user.id, email: user.email, cookie, ctoken });
          finalCartId = cartId;
        } catch (connectError: any) {
          console.error(`[authenticateUser] Failed to connect cart to user:`, connectError);
        }
      }

      const responseData: any = {
        message: `✅ Successfully logged in as ${user.email}! Your session has been saved.`,
        userId: user.id,
        email: user.email,
        activeCartId: finalCartId,
        storeId,
        __clientAction: {
          type: 'saveSessionToken',
          storeId,
          sessionToken,
          email: user.email,
          userId: user.id,
          activeCartId: finalCartId
        }
      };

      if (addressData && addressData.firstName && addressData.address1) {
        responseData.pendingAddressData = addressData;
      }

      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(responseData, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: `❌ Login failed: ${error.message}`
          }]
        }
      };
    }
  }

  if (name === 'loginUser') {
    const { storeId, email, message, cartId, addressData } = args;

    const { store, adapter } = await resolveAdapter(storeId, customMarketplaceConfig);

    // Generate HTML using adapter UI method if available
    let htmlContent: string;
    if (adapter.generateLoginUI) {
      htmlContent = await adapter.generateLoginUI({
        store,
        storeId,
        email,
        message,
        cartId,
        addressData
      });
    } else {
      throw new Error('Login UI generation not supported for this platform');
    }

    const uiResource = createUIResource({
      uri: `ui://marketplace/login?store=${encodeURIComponent(storeId)}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  throw new Error(`Cart tool ${name} not found`);
}