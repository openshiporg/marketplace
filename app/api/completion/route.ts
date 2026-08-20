import { convertToModelMessages, streamText, stepCountIs } from 'ai';
import { createMCPClient } from '@ai-sdk/mcp';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { getBaseUrl } from '@/features/marketplace/lib/getBaseUrl';
import { normalizeOpenAICompatibleBaseURL } from '@/lib/ai-provider';
import { assertTrustedHttpsEndpoint, createTrustedFetch, customAiAllowedOrigins } from '@/lib/remote-endpoint';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { discoveryToolForUserText } from '@/lib/marketplace-discovery';
import { forcedFollowUpToolForSteps } from '@/lib/completion-tool-routing';

function getLatestUserText(messages: any[]): string {
  const latestUserMessage = [...messages].reverse().find((message) => message?.role === 'user');
  if (!latestUserMessage) return '';
  if (typeof latestUserMessage.content === 'string') return latestUserMessage.content;
  return Array.isArray(latestUserMessage.parts)
    ? latestUserMessage.parts
        .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
        .map((part: any) => part.text)
        .join(' ')
    : '';
}

function latestStepReturnedUiResource({ steps }: { steps: Array<any> }): boolean {
  const latestStep = steps.at(-1);
  return (latestStep?.toolResults || []).some((toolResult: any) => {
    const output = toolResult?.output;
    const content = output?.content || output?.result?.content;
    return Array.isArray(content) && content.some((item: any) => {
      const uri = item?.resource?.uri || item?.uri;
      return item?.type === 'resource' && typeof uri === 'string' && uri.startsWith('ui://');
    });
  });
}

type ScopedMcpRequest = {
  cookies: string;
  cartIds?: Record<string, string>;
  sessionTokens?: Record<string, string>;
  marketplaceConfig?: unknown[];
};

/**
 * Scope request forwarding to this one local MCP transport. In particular, do
 * not replace global.fetch: the completion process may concurrently talk to an
 * AI provider, another MCP request, or another customer.
 */
function createScopedMcpFetch({ cookies, cartIds, sessionTokens, marketplaceConfig }: ScopedMcpRequest) {
  let receivedCookies = cookies ? [cookies] : [];
  const cartIdsHeader = cartIds && Object.keys(cartIds).length ? JSON.stringify(cartIds) : undefined;
  const marketplaceConfigHeader = Array.isArray(marketplaceConfig) ? JSON.stringify(marketplaceConfig) : undefined;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    if (receivedCookies.length) headers.set('Cookie', receivedCookies.join('; '));
    if (cartIdsHeader) headers.set('X-Cart-Ids', cartIdsHeader);
    if (marketplaceConfigHeader) headers.set('X-Marketplace-Config', marketplaceConfigHeader);

    let storeId: string | undefined;
    try {
      const payload = JSON.parse(await request.clone().text());
      storeId = payload?.params?.arguments?.storeId;
    } catch {
      // MCP lifecycle requests do not all have JSON bodies.
    }
    if (storeId && sessionTokens?.[storeId]) {
      headers.set('Authorization', `Bearer ${sessionTokens[storeId]}`);
    }

    const response = await fetch(request, { headers });
    if (typeof response.headers.getSetCookie === 'function') {
      receivedCookies = [...receivedCookies, ...response.headers.getSetCookie()];
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) receivedCookies = [...receivedCookies, setCookie];
    }
    return response;
  };
}

export async function POST(req: Request) {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    let messages = Array.isArray(body?.messages) ? body.messages : [];

    const MAX_MESSAGES = 20;
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);

    const useGlobalKeys = body?.useGlobalKeys === true;
    const useLocalKeys = body?.useLocalKeys === true;
    if (useGlobalKeys === useLocalKeys) {
      return Response.json({ error: 'Choose exactly one AI configuration mode' }, { status: 400 });
    }

    const provider = useGlobalKeys ? 'openrouter' : body?.provider;
    if (provider !== 'openrouter' && provider !== 'custom') {
      return Response.json({ error: 'Unsupported AI provider' }, { status: 400 });
    }

    const apiKey = useGlobalKeys
      ? process.env.OPENROUTER_API_KEY || ''
      : typeof body?.apiKey === 'string'
        ? body.apiKey.trim()
        : '';
    if (!apiKey) return Response.json({ error: 'API key is required' }, { status: 400 });

    const model = (useGlobalKeys
      ? process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
      : typeof body?.model === 'string'
        ? body.model
        : '').trim();
    if (!model) return Response.json({ error: 'Model is required' }, { status: 400 });

    let customProvider: ReturnType<typeof createOpenAI> | null = null;
    if (provider === 'custom') {
      const allowedOrigins = customAiAllowedOrigins();
      if (!allowedOrigins.length) {
        return Response.json({ error: 'Custom AI endpoints are not admitted for this deployment' }, { status: 403 });
      }

      const baseURL = normalizeOpenAICompatibleBaseURL(body?.customEndpoint || '');
      await assertTrustedHttpsEndpoint(baseURL, { allowedOrigins });
      customProvider = createOpenAI({
        apiKey,
        baseURL,
        name: 'custom-openai-compatible',
        fetch: createTrustedFetch({ allowedOrigins }),
      });
    }

    const baseUrl = await getBaseUrl();
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/api/mcp-transport/http`),
      {
        fetch: createScopedMcpFetch({
          cookies: req.headers.get('cookie') || '',
          cartIds: body?.cartIds,
          sessionTokens: body?.sessionTokens,
          marketplaceConfig: body?.marketplaceConfig,
        }),
      }
    );

    mcpClient = await createMCPClient({ transport });
    const aiTools = await mcpClient.tools();
    const languageModel = provider === 'custom'
      ? customProvider!.chat(model)
      : createOpenRouter({ apiKey })(model);

    const maxTokens = useGlobalKeys
      ? process.env.OPENROUTER_MAX_TOKENS
        ? parseInt(process.env.OPENROUTER_MAX_TOKENS)
        : 4000
      : body?.maxTokens
        ? parseInt(body.maxTokens)
        : undefined;

    const cartContext = body?.cartIds && Object.keys(body.cartIds).length > 0
      ? `\n\nCURRENT CART CONTEXT: ${JSON.stringify(body.cartIds)}`
      : '';
    const discoveryTool = discoveryToolForUserText(getLatestUserText(messages));

    const systemInstructions = `You're an expert shopping assistant.${cartContext}

CRITICAL RULES:
1. SOURCE FIRST: ALWAYS call getAvailableStores first. Use its stable storeIds, platform, public address, and supported countries. Never infer a merchant location from its name or URL.
2. ROUTE BEFORE DISCOVERY:
   - Retail intent (products, clothing, T-shirts, goods, shopping) -> discoverProducts. It is e-commerce-only.
   - Restaurant intent (restaurant, food, dish, menu, takeout, dinner) -> discoverRestaurantMenus. It is restaurant-only.
   - Never call a discovery tool for the wrong vertical, and never mix retail products into a restaurant request.
3. SEARCH INPUTS: Pass only concise item/dish keywords in query, such as "t-shirt", "burger", or "vegan"—not the user's full sentence. Omit query only when the user explicitly wants to browse that vertical. Pass relevant storeIds when the user names a source.
4. LOCATION TRUTH: Put city/region/country words in location, not query. Pass a lowercase countryCode when the country is known. Only claim a location match when the source's public address/country metadata supports it. If no admitted source matches Toronto, for example, say so instead of showing unrelated stores or claiming proximity.
5. COMPLETE DISCOVERY: After getAvailableStores, call the correctly scoped discovery tool in the same turn unless the user asked only for store names, the requested location has no explicit match, or a clarification is genuinely required. Do not list stores as a substitute for showing matching products or menus.
6. SILENT UI HANDLING: If a tool returns a UI resource (uri starts with ui://), STOP immediately. Say nothing.
7. CHECKOUT FOLLOW-UP: After setShippingAddress or setRestaurantFulfillment returns success, call viewCart in the next step. These mutations are not silent tools. When a cart UI prompt contains pasted customer/address text, parse only that real text into the appropriate tool fields. Never substitute sample or guessed values. Ask for any required missing detail instead of calling the mutation.
8. CART: ALWAYS use getOrCreateCart with a lowercase countryCode (e.g., 'us').
9. RESTAURANT CARTS: Use getProduct when menu customization is needed. Restaurant carts default to pickup. Use setRestaurantFulfillment to select pickup/delivery and save parsed contact or delivery details. Pickup requires customerName, email, and customerPhone. Delivery also requires deliveryAddress, deliveryCity, deliveryZip, and a two-letter deliveryCountryCode; include address line 2/state only when present. Preserve the requested orderType. Never invent customer data, delivery availability, zones, fees, minimums, or estimates; use source configuration. Delivery does not use an e-commerce shipping method.

AVAILABLE TOOLS: getAvailableStores, getAvailableCountries, discoverProducts, discoverRestaurantMenus, getProduct, getOrCreateCart, viewCart, addToCart, setShippingAddress, setRestaurantFulfillment, loginUser, setShippingMethod, initiatePaymentSession, completeCart.`;

    const streamTextConfig: Parameters<typeof streamText>[0] = {
      model: languageModel,
      tools: aiTools,
      messages: await convertToModelMessages(messages),
      system: systemInstructions,
      stopWhen: [stepCountIs(10), latestStepReturnedUiResource],
      prepareStep: ({ stepNumber, steps }) => {
        const followUpTool = forcedFollowUpToolForSteps(steps);
        if (followUpTool) {
          return { toolChoice: { type: 'tool', toolName: followUpTool } };
        }
        if (stepNumber === 0) {
          return { toolChoice: { type: 'tool', toolName: 'getAvailableStores' } };
        }
        if (stepNumber === 1 && discoveryTool) {
          return { toolChoice: { type: 'tool', toolName: discoveryTool } };
        }
        return undefined;
      },
      onFinish: async () => { await mcpClient?.close(); },
      onError: async () => { await mcpClient?.close(); },
    };

    if (maxTokens) streamTextConfig.maxOutputTokens = maxTokens;

    return streamText(streamTextConfig).toUIMessageStreamResponse({
      originalMessages: messages,
      onError: () => 'The completion request failed',
    });
  } catch {
    if (mcpClient) await mcpClient.close();
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
