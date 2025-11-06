import { streamText, experimental_createMCPClient } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getBaseUrl } from '@/features/marketplace/lib/getBaseUrl';
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Cookie and Authorization-aware transport that properly handles cookie, C-token, cart IDs, and session tokens forwarding
class CookieAwareTransport extends StreamableHTTPClientTransport {
  private cookies: string[] = [];
  private authHeader?: string;
  private cartIdsHeader?: string;
  private sessionTokens: Record<string, string> = {};
  private originalFetch: typeof fetch;

  constructor(url: URL, opts?: StreamableHTTPClientTransportOptions, cookies?: string, authHeader?: string, cartIds?: Record<string, string>, sessionTokens?: Record<string, string>) {
    super(url, opts);

    this.originalFetch = global.fetch;

    // Set initial cookies if provided
    if (cookies) {
      this.cookies = [cookies];
    }

    // Set auth header (for C-token support)
    if (authHeader) {
      this.authHeader = authHeader;
    }

    // Set cart IDs header (for cart context)
    if (cartIds && Object.keys(cartIds).length > 0) {
      this.cartIdsHeader = JSON.stringify(cartIds);
    }

    // Store session tokens (for authenticated requests)
    if (sessionTokens && Object.keys(sessionTokens).length > 0) {
      this.sessionTokens = sessionTokens;
    }

    // Override global fetch to include cookies, authorization, cart IDs, and session tokens
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      init = init || {};
      const headers = new Headers(init.headers);

      if (this.cookies.length > 0) {
        const cookieHeader = this.cookies.join('; ');
        headers.set('Cookie', cookieHeader);
      }

      // Check if this is a request to MCP transport and extract storeId from body to set the right session token
      let storeIdFromBody: string | undefined;
      if (init.body && typeof init.body === 'string') {
        try {
          const bodyJson = JSON.parse(init.body);
          // MCP tool calls have params.arguments.storeId
          storeIdFromBody = bodyJson?.params?.arguments?.storeId;
        } catch (e) {
          // Not JSON or parsing failed, ignore
        }
      }

      // If we have a session token for this storeId, use it; otherwise fall back to authHeader
      if (storeIdFromBody && this.sessionTokens[storeIdFromBody]) {
        headers.set('Authorization', `Bearer ${this.sessionTokens[storeIdFromBody]}`);
      } else if (this.authHeader) {
        headers.set('Authorization', this.authHeader);
      }

      // Forward Cart IDs header (for cart context)
      if (this.cartIdsHeader) {
        headers.set('X-Cart-Ids', this.cartIdsHeader);
      }

      init.headers = headers;

      const response = await this.originalFetch(input, init);

      // Store any new cookies from response
      // Use getSetCookie() to properly get all Set-Cookie headers (not just the first one)
      if (typeof response.headers.getSetCookie === 'function') {
        const setCookies = response.headers.getSetCookie();
        if (setCookies.length > 0) {
          this.cookies = [...this.cookies, ...setCookies];
        }
      } else {
        // Fallback for older environments
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          this.cookies = [...this.cookies, setCookieHeader];
        }
      }

      return response;
    };
  }

  async close(): Promise<void> {
    // Restore original fetch
    global.fetch = this.originalFetch;
    this.cookies = [];
    this.authHeader = undefined;
    this.cartIdsHeader = undefined;
    this.sessionTokens = {};
    await super.close();
  }
}

export async function POST(req: Request) {
  let mcpClient: any = null;

  try {
    const body = await req.json();
    let messages = body.messages || [];

    // Trim messages if conversation is too long (keep system context by preserving recent messages)
    const MAX_MESSAGES = 20; // Keep last 20 messages for context
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES);
    }

    let apiKey: string;
    if (body.useGlobalKeys) {
      apiKey = process.env.OPENROUTER_API_KEY || '';
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Global API key not configured',
          details: 'OPENROUTER_API_KEY environment variable is not set'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (body.useLocalKeys && body.apiKey) {
      apiKey = body.apiKey;
    } else {
      return new Response(JSON.stringify({
        error: 'API key is required',
        details: 'Either set useGlobalKeys=true or provide apiKey in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openrouterConfig = {
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    };

    // Get dynamic base URL
    const baseUrl = await getBaseUrl();
    const mcpEndpoint = `${baseUrl}/api/mcp-transport/http`;

    const cookie = req.headers.get('cookie') || '';
    const authHeader = req.headers.get('authorization') || '';

    // Create MCP client with cookie, authorization, cart IDs, and session tokens support
    const transport = new CookieAwareTransport(
      new URL(mcpEndpoint),
      {},
      cookie,
      authHeader,
      body.cartIds,
      body.sessionTokens
    );

    mcpClient = await experimental_createMCPClient({
      transport,
    });

    const aiTools = await mcpClient.tools();

    // Create OpenRouter client with current configuration
    const openrouter = createOpenAI(openrouterConfig);

    let model: string;
    let maxTokens: number | undefined;

    if (body.useGlobalKeys) {
      model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
      maxTokens = process.env.OPENROUTER_MAX_TOKENS ? parseInt(process.env.OPENROUTER_MAX_TOKENS) : 4000;
    } else {
      if (!body.model) {
        return new Response(JSON.stringify({
          error: 'Model is required',
          details: 'Model must be provided in request body when using local keys'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      model = body.model;
      maxTokens = body.maxTokens ? parseInt(body.maxTokens) : undefined;
    }

    // Test the API key with a simple request first to catch auth errors early
    try {
      const testResponse = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${openrouterConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();

        let errorMessage = 'Invalid API key';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson?.error?.message || errorMessage;
        } catch {
          // Failed to parse error, use default message
        }

        return new Response(JSON.stringify({
          error: 'Authentication Error',
          details: errorMessage
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (validationError) {
      console.error('API key validation error:', validationError);
      return new Response(JSON.stringify({
        error: 'Authentication Error',
        details: 'Failed to validate API key'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add cart context if provided
    const cartContext = body.cartIds && Object.keys(body.cartIds).length > 0
      ? `\n\nCURRENT CART CONTEXT (from user's browser localStorage):
${Object.entries(body.cartIds).map(([endpoint, cartId]) =>
  `- Store: ${endpoint}\n  Cart ID: ${cartId}`
).join('\n')}\n\nNOTE: The getOrCreateCart tool will automatically check for and reuse these existing carts.`
      : '';

    const systemInstructions = `You're an expert at helping users shop across multiple e-commerce stores in our marketplace.${cartContext}

CRITICAL: UI RESOURCES - AUTOMATIC DETECTION AND SILENT HANDLING
Some tools return interactive UI resources that display automatically to the user. These are identified by:
- Response type: "resource"
- Resource URI starting with: "ui://"
- MimeType: "text/html", "text/uri-list", or "application/vnd.mcp-ui.remote-dom"

ABSOLUTELY CRITICAL RULE:
When a tool returns a UI resource (detected by the structure above), you MUST:
1. DO NOT generate ANY text response
2. DO NOT describe what's in the UI
3. DO NOT list content, items, products, or details
4. DO NOT explain how to use the UI
5. DO NOT acknowledge what you're showing
6. Just let the tool call complete and STOP - the UI will render automatically

WHY THIS IS CRITICAL:
- The UI is interactive and users can see everything themselves
- When you continue talking after showing UI, it causes the UI to flash and disappear
- Your text response interferes with the UI rendering
- The user ONLY wants to see the UI, not your explanation of it
- This applies to ALL tools that return UI resources, not just specific tool names

DETECTION PATTERN:
If tool response contains: { type: "resource", resource: { uri: "ui://...", ... } }
Then: STOP immediately - do not generate any text

ADDITIONAL SILENT TOOLS:
The following tools also require NO text response after calling:
- initiatePaymentSession: Payment UI is embedded in cart, do not explain the session details
- After calling these tools, just STOP - do not describe the response

CORRECT BEHAVIOR:
User: "show me products"
You: [Call discoverProducts tool, which returns UI resource, then STOP - say absolutely nothing]

User: "I want to pay with Stripe"
You: [Call initiatePaymentSession, then STOP - say absolutely nothing]

INCORRECT BEHAVIOR (DO NOT DO THIS):
User: "show me products"
You: [Call discoverProducts tool] "Here are the products available in our marketplace from both stores. You can browse through them, select variants, and add items to your cart."
^ THIS IS WRONG - Do not explain after showing UI!

User: "I want to pay with Stripe"
You: [Call initiatePaymentSession] "I've initiated a payment session for Stripe. The payment form will now render..."
^ THIS IS WRONG - Do not explain payment sessions!

CRITICAL FIRST STEP - STORE DISCOVERY:
Before ANY e-commerce operation, you MUST call getAvailableStores to get the list of stores.
- getAvailableStores returns: { stores: [{ id, name, storeId, baseUrl }], totalStores, message }
- ALL subsequent commerce tools require the storeId parameter from this response
- If you don't have a storeId yet, call getAvailableStores immediately

AVAILABLE COMMERCE TOOLS:
**Store Discovery:**
- getAvailableStores: Get list of stores in marketplace (ALWAYS CALL THIS FIRST!)

**Product Discovery:**
- getAvailableCountries: Get list of countries (requires storeId)
- searchProducts: Find products with filters (requires storeId + countryCode)
- getProduct: Get product details with variants/pricing (requires storeId)

**Shopping Cart:**
- getOrCreateCart: ALWAYS use this to get/create cart (automatically checks for existing active carts and reuses them, requires storeId + countryCode)
- getCart: View cart contents (JSON only)
- viewCart: View cart with interactive UI
- addToCart: Add product variant to cart (requires exact variant ID)
- updateCartItem: Change quantities
- removeCartItem: Remove items
- applyDiscount: Apply coupon codes

CRITICAL CART MANAGEMENT:
- ALWAYS use getOrCreateCart instead of createCart
- getOrCreateCart automatically detects existing carts from the cart context and reuses them if still active
- Only creates a new cart if no active cart exists or if the previous cart was completed
- When user provides a cartId in their message (e.g., "cartId: cart_123"), ALWAYS use that exact cartId for the operation

**Checkout:**
- setShippingAddress: Set customer address (auto-creates guest user + authenticates them)
  * IMPORTANT: Always ask for email FIRST before calling this
  * If you get EMAIL_EXISTS error, offer two options:
    1. "Login with existing account" → call loginUser tool WITH the addressData (firstName, lastName, address1, city, etc.) you just tried to use
    2. "Use a different email" → ask for new email
  * On success, returns sessionToken - save this to browser localStorage
- loginUser: Show login UI for existing account holders
  * Call this when user wants to login OR when EMAIL_EXISTS error occurs
  * CRITICAL: When calling after EMAIL_EXISTS, you MUST pass the addressData parameter with the address details the user provided
  * The addressData will be automatically applied after successful login
  * Returns interactive login form that saves session to localStorage
- setShippingMethod: Set the shipping method for the cart
  * IMPORTANT: When user clicks a shipping option in the cart UI, the UI sends a message with metadata
  * The metadata contains: { action: 'setShippingMethod', cartId, shippingOptionId, storeId }
  * Extract these values from the message metadata and call: setShippingMethod(storeId, cartId, shippingOptionId)
  * NOTE: The parameter name in the tool is 'shippingMethodId', but the metadata uses 'shippingOptionId' - pass shippingOptionId as shippingMethodId
  * After setting, call viewCart to show the updated cart with selected shipping
- initiatePaymentSession: Start payment session for Stripe/PayPal (returns interactive payment UI)
- getCheckoutLink: Get checkout URL with validation (optional - mainly for reference)
- placeOrder: Complete order programmatically

**Payment:**
- When user selects Stripe or PayPal from cart UI, call initiatePaymentSession
- initiatePaymentSession returns interactive UI with:
  * Stripe: Card input form for entering credit card details
  * PayPal: PayPal button for completing payment
- After successful payment, the UI will send you a message: "Please complete my order"
- When you receive this message, immediately call completeCart with the cartId and storeId
- completeCart finalizes the order and returns order confirmation details
- After calling completeCart, inform the user their order was placed successfully

**Checkout Process:**
- getCheckoutLink: Validate cart completeness and generate secure checkout URL (provides warnings for missing steps)
- Users can complete payment in the cart drawer (accessible via cart icon in header)
- Cart drawer shows payment options (Stripe/PayPal) based on store configuration
- Alternatively, users can checkout on the store directly via the checkout link

**Order Management:**
- getOrder: View order details (supports guest orders with secretKey)

COUNTRY HANDLING:
- Always ask users for their COUNTRY (users say "I'm in the US", not "I'm in North America")
- Use getAvailableCountries to get the list of countries we ship to
- Present country selection like: "Which country should I show pricing for?" or "Where would you like this shipped to? We ship to: United States, Canada, United Kingdom..."
- The system automatically handles region mapping internally for cart creation and pricing
- Never mention regions to users - they only care about countries
- If no country provided, use getAvailableCountries first, then ask user to choose their country

PRODUCT VARIANTS:
- Products can have multiple variants (sizes, colors, options)
- When users want to "buy a shirt", guide them to specify size, color, etc.
- Use getProduct to show available variants and options
- Always require specific variant ID for addToCart operations
- Provide helpful guidance: "This product has 3 variants. Available options: Size: S, M, L; Color: Red, Blue. Please specify which variant you want."

HANDLING UI INTERACTIONS:
- When user clicks shipping option in cart UI, the UI sends a chat message with metadata
- Example message: "Please set my shipping method to Express Shipping"
- Example metadata: { action: 'setShippingMethod', shippingOptionId: '123', cartId: 'cart_456', storeId: 'store-123' }
- Extract the metadata values and call the corresponding tool
- For setShippingMethod: use shippingOptionId from metadata as the shippingMethodId parameter

COMMERCE WORKFLOW EXAMPLES:
- "Show me products" → getAvailableCountries → "Which country should I show pricing for? We ship to: United States, Canada, UK..." → searchProducts with chosen country
- "I want to buy a red shirt size M" → Ask country if not provided → searchProducts → getProduct to show variants → guide to specific variant → addToCart
- "Add to cart" without variant → Guide user: "This product comes in different sizes and colors. Let me show you the options..." → getProduct → help choose variant
- Setting address with guest checkout:
  1. Ask: "What's your email address?"
  2. Call setShippingAddress with email + address details
  3. If EMAIL_EXISTS error: "An account with {email} already exists. Would you like to: 1) Login, or 2) Use a different email?"
  4. If user chooses login → CRITICAL: call loginUser tool WITH THE SAME addressData (firstName, lastName, address1, city, postalCode, countryCode, province, company, phone) that you just tried to use in setShippingAddress
  5. If user chooses different email → ask for new email and retry setShippingAddress

CRITICAL: PROPER ORDER PLACEMENT WORKFLOW:
When users ask to "place an order" or "buy products", DO NOT try to directly create Order records using createData/createOrder. Instead, follow this proper e-commerce workflow:

1. getAvailableCountries (if country not specified)
2. getOrCreateCart (with customer's country - use lowercase like "us", "ca", "gb")
3. searchProducts (to find products with countryCode)
4. getProduct (to get specific variants and pricing)
5. addToCart (add specific product variants using exact variant ID and cart ID from step 2)
6. setShippingAddress (with customer details - includes email, name, address)
7. getCheckoutLink (validates cart completeness and provides smart warnings/recommendations)
8. placeOrder (attempt to complete programmatically) OR direct customer to checkout link

IMPORTANT: CHECKOUT FLOW
When users are ready to checkout:
1. Direct them to open the cart drawer (click cart icon in header)
2. The cart drawer shows all cart items and payment options
3. Users can complete payment directly in the drawer (Stripe/PayPal based on store config)
4. Alternatively, provide checkout link via getCheckoutLink for store checkout

getCheckoutLink provides intelligent validation:
- ✅ READY status = cart complete, customer can pay immediately
- ⚠️ INCOMPLETE status = shows exactly what's missing with specific recommendations
- Use getCheckoutLink proactively to validate cart state

FRIENDLY CUSTOMER SERVICE APPROACH:
- Use welcoming language: "Where would you like this shipped?"
- Present options clearly: "We ship to these countries: United States, Canada, United Kingdom..."
- For variants: "This comes in several options! Let me show you what's available..."
- Make it conversational, not technical
- Always follow the proper workflow: getAvailableStores → then use the storeId for all subsequent operations`;

    const streamTextConfig: any = {
      model: openrouter(model),
      tools: aiTools,
      messages,
      system: systemInstructions,
      maxSteps: 10,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat-completion',
      },
      onStepFinish: async ({ toolCalls, toolResults, text }) => {
        // Step finished
      },
      onFinish: async () => {
        await mcpClient.close();
      },
      onError: async (error: unknown) => {
        console.error('Stream error occurred:', error);
        await mcpClient.close();
      },
    };

    // Add maxTokens only if specified
    if (maxTokens) {
      streamTextConfig.maxTokens = maxTokens;
    }

    const response = streamText(streamTextConfig);
    const stream = response.toDataStream();
    const reader = stream.getReader();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        }
      }
    );

  } catch (error) {
    // Clean up MCP client if it was created
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {}
    }

    // Log the full error for debugging
    console.error('Completion API Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error
    });

    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
