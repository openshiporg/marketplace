import { convertToModelMessages, streamText, stepCountIs } from 'ai';
import { createMCPClient } from '@ai-sdk/mcp';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getBaseUrl } from '@/features/marketplace/lib/getBaseUrl';
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

class CookieAwareTransport extends StreamableHTTPClientTransport {
  private cookies: string[] = [];
  private authHeader?: string;
  private cartIdsHeader?: string;
  private sessionTokens: Record<string, string> = {};
  private marketplaceConfigHeader?: string;
  private originalFetch: typeof fetch;

  constructor(url: URL, opts?: StreamableHTTPClientTransportOptions, cookies?: string, authHeader?: string, cartIds?: Record<string, string>, sessionTokens?: Record<string, string>, marketplaceConfig?: any[]) {
    super(url, opts);
    this.originalFetch = global.fetch;
    if (cookies) this.cookies = [cookies];
    if (authHeader) this.authHeader = authHeader;
    if (cartIds && Object.keys(cartIds).length > 0) this.cartIdsHeader = JSON.stringify(cartIds);
    if (sessionTokens && Object.keys(sessionTokens).length > 0) this.sessionTokens = sessionTokens;
    if (marketplaceConfig && Array.isArray(marketplaceConfig)) this.marketplaceConfigHeader = JSON.stringify(marketplaceConfig);

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      init = init || {};
      const headers = new Headers(init.headers);
      if (this.cookies.length > 0) headers.set('Cookie', this.cookies.join('; '));

      let storeIdFromBody: string | undefined;
      if (init.body && typeof init.body === 'string') {
        try {
          const bodyJson = JSON.parse(init.body);
          storeIdFromBody = bodyJson?.params?.arguments?.storeId;
        } catch (e) {}
      }

      if (storeIdFromBody && this.sessionTokens[storeIdFromBody]) {
        headers.set('Authorization', `Bearer ${this.sessionTokens[storeIdFromBody]}`);
      } else if (this.authHeader) {
        headers.set('Authorization', this.authHeader);
      }

      if (this.cartIdsHeader) headers.set('X-Cart-Ids', this.cartIdsHeader);
      if (this.marketplaceConfigHeader) headers.set('X-Marketplace-Config', this.marketplaceConfigHeader);

      init.headers = headers;
      const response = await this.originalFetch(input, init);

      if (typeof response.headers.getSetCookie === 'function') {
        const setCookies = response.headers.getSetCookie();
        if (setCookies.length > 0) this.cookies = [...this.cookies, ...setCookies];
      } else {
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) this.cookies = [...this.cookies, setCookieHeader];
      }
      return response;
    };
  }

  async close(): Promise<void> {
    global.fetch = this.originalFetch;
    await super.close();
  }
}

export async function POST(req: Request) {
  let mcpClient: any = null;
  const requestId = `completion-${Date.now()}`;

  try {
    const body = await req.json().catch(() => ({}));
    let messages = Array.isArray(body?.messages) ? body.messages : [];

    const MAX_MESSAGES = 20;
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);

    let apiKey: string;
    if (body?.useGlobalKeys) {
      apiKey = process.env.OPENROUTER_API_KEY || '';
    } else if (body?.useLocalKeys && body?.apiKey) {
      apiKey = body.apiKey;
    } else {
      return new Response(JSON.stringify({ error: 'API key is required' }), { status: 400 });
    }

    let baseURL = 'https://openrouter.ai/api/v1';
    if (body?.provider === 'custom' && body?.customEndpoint) {
      baseURL = body.customEndpoint.endsWith('/v1') ? body.customEndpoint : `${body.customEndpoint.replace(/\/$/, '')}/v1`;
    }

    const baseUrl = await getBaseUrl();
    const transport = new CookieAwareTransport(
      new URL(`${baseUrl}/api/mcp-transport/http`),
      {},
      req.headers.get('cookie') || '',
      req.headers.get('authorization') || '',
      body?.cartIds,
      body?.sessionTokens,
      body?.marketplaceConfig
    );

    mcpClient = await createMCPClient({ transport });
    const aiTools = await mcpClient.tools();
    const openrouter = createOpenRouter({ apiKey, baseURL });

    let model = body?.useGlobalKeys ? (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini') : body?.model;
    let maxTokens = body?.useGlobalKeys ? (process.env.OPENROUTER_MAX_TOKENS ? parseInt(process.env.OPENROUTER_MAX_TOKENS) : 4000) : (body?.maxTokens ? parseInt(body.maxTokens) : undefined);

    const cartContext = body?.cartIds && Object.keys(body.cartIds).length > 0
      ? `\n\nCURRENT CART CONTEXT: ${JSON.stringify(body.cartIds)}`
      : '';

    const systemInstructions = `You're an expert shopping assistant.${cartContext}

CRITICAL RULES:
1. ALWAYS call getAvailableStores first to get storeIds.
2. PRODUCT DISCOVERY: Use discoverProducts, then filter results manually for the user.
3. SILENT UI HANDLING: If a tool returns a UI resource (uri starts with ui://), STOP immediately. Say nothing.
4. CHECKOUT FOLLOW-UP: After setShippingAddress returns success, you MUST call viewCart in the next step. setShippingAddress is NOT a silent tool.
5. CART: ALWAYS use getOrCreateCart with a lowercase countryCode (e.g., 'us').

AVAILABLE TOOLS: getAvailableStores, discoverProducts, getOrCreateCart, viewCart, addToCart, setShippingAddress, loginUser, setShippingMethod, initiatePaymentSession, completeCart.`;

    const streamTextConfig: any = {
      model: openrouter(model),
      tools: aiTools,
      messages: await convertToModelMessages(messages),
      system: systemInstructions,
      stopWhen: stepCountIs(10),
      onFinish: async () => { await mcpClient?.close(); },
      onError: async () => { await mcpClient?.close(); },
    };

    if (maxTokens) streamTextConfig.maxOutputTokens = maxTokens;

    const result = streamText(streamTextConfig);

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: error => error instanceof Error ? error.message : String(error),
    });

  } catch (error) {
    if (mcpClient) await mcpClient.close();
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), { status: 500 });
  }
}
