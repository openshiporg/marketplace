"use client";

import type { UIMessage as TMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { memo, useCallback } from "react";
import equal from "fast-deep-equal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "./tool-invocation";
import { UIResourceRenderer, isUIResource } from '@mcp-ui/client';
import { getAllCarts, getCartId as getLocalCartId, setCartId as saveCartToLocalStorage } from '@/lib/cart-storage';
import { getSessionToken, setSession } from '@/lib/session-storage';
import { getMarketplaceConfig } from '@/lib/marketplace-storage';

interface AIMessageProps {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  sendMessage: UseChatHelpers["sendMessage"];
  stop: UseChatHelpers["stop"];
  setMessages: UseChatHelpers["setMessages"];
  messages: TMessage[];
}

const PureAIMessage = ({
  message,
  isLoading,
  status,
  isLatestMessage,
  sendMessage,
  stop,
  setMessages,
  messages,
}: AIMessageProps) => {
  const callViewCartDirectly = async (storeId: string, cartId: string) => {
    try {
      let xCartIds = '{}';
      try {
        const carts = getAllCarts();
        const ids: Record<string, string> = {};
        Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
        xCartIds = JSON.stringify(ids);
      } catch {}

      const token = getSessionToken(storeId);
      const marketplaceConfig = getMarketplaceConfig();
      const viewCartHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-cart-ids': xCartIds,
        'x-marketplace-config': JSON.stringify(marketplaceConfig)
      };
      if (token) viewCartHeaders['Authorization'] = `Bearer ${token}`;

      const viewCartResponse = await fetch('/api/mcp-transport/http', {
        method: 'POST',
        headers: viewCartHeaders,
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `view-cart-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: 'viewCart',
            arguments: { storeId, cartId },
          },
        }),
      });

      const viewCartResult = await viewCartResponse.json();

      if (viewCartResult.result) {
        stop();
        const toolCallId = `call_${Date.now()}`;
        setMessages((currentMessages) => [...currentMessages, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'dynamic-tool',
            toolCallId,
            toolName: 'viewCart',
            input: { storeId, cartId },
            state: 'output-available',
            output: viewCartResult.result,
          }],
        } as any]);
      }
    } catch (e) {
      console.error('[callViewCartDirectly] Error calling viewCart:', e);
    }
  };

  const handleUiAction = useCallback(async (actionResult: any) => {
    const { messageId, type, payload } = actionResult;

    if (type === 'tool' && payload?.toolName) {
      try {
        if (payload.toolName === 'authenticateUser') {
          let xCartIds = '{}';
          try {
            const carts = getAllCarts();
            const ids: Record<string, string> = {};
            Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
            xCartIds = JSON.stringify(ids);
          } catch {}

          const storeId = payload.params?.storeId;
          const existingToken = getSessionToken(storeId);
          const marketplaceConfig = getMarketplaceConfig();
          const baseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-cart-ids': xCartIds,
            'x-marketplace-config': JSON.stringify(marketplaceConfig)
          };
          if (existingToken) baseHeaders['Authorization'] = `Bearer ${existingToken}`;

          const response = await fetch('/api/mcp-transport/http', {
            method: 'POST',
            headers: baseHeaders,
            credentials: 'include',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: messageId || `auth-${Date.now()}`,
              method: 'tools/call',
              params: {
                name: 'authenticateUser',
                arguments: payload.params || {},
              },
            }),
          });

          const result = await response.json();
          let authData: any = null;
          try {
            const text = result?.result?.content?.[0]?.text;
            if (text) authData = JSON.parse(text);
          } catch (e) {}

          try {
            const ca = authData?.__clientAction;
            if (ca?.type === 'saveSessionToken' && ca.sessionToken && storeId) {
              setSession(storeId, {
                token: ca.sessionToken,
                email: ca.email,
                userId: ca.userId,
                activeCartId: ca.activeCartId,
              });
              if (ca.activeCartId) {
                saveCartToLocalStorage(storeId, ca.activeCartId);
              }
            }
          } catch {}

          try {
            const pendingAddress = authData?.pendingAddressData;
            const finalCartId = authData?.activeCartId || authData?.__clientAction?.activeCartId || payload.params?.cartId;
            const tokenForEndpoint = getSessionToken(storeId);

            if (storeId && finalCartId && pendingAddress) {
              let xIds = '{}';
              try {
                const carts = getAllCarts();
                const ids: Record<string, string> = {};
                Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
                xIds = JSON.stringify(ids);
              } catch {}

              const marketplaceConfig = getMarketplaceConfig();
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-cart-ids': xIds,
                'x-marketplace-config': JSON.stringify(marketplaceConfig)
              };
              if (tokenForEndpoint) headers['Authorization'] = `Bearer ${tokenForEndpoint}`;

              await fetch('/api/mcp-transport/http', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: `set-addr-${Date.now()}`,
                  method: 'tools/call',
                  params: {
                    name: 'setShippingAddress',
                    arguments: {
                      storeId: storeId,
                      cartId: finalCartId,
                      email: authData?.email,
                      ...pendingAddress,
                    },
                  },
                }),
              });
              await callViewCartDirectly(storeId, finalCartId);
            } else if (authData?.message && authData.message.includes('Successfully logged in')) {
              await callViewCartDirectly(storeId, finalCartId);
            }
          } catch (e) {}

          return result.result;
        }

        let xCartIdsForCall = '{}';
        try {
          const carts = getAllCarts();
          const ids: Record<string, string> = {};
          Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
          xCartIdsForCall = JSON.stringify(ids);
        } catch {}

        const storeIdForCall = payload.params?.storeId;
        const tokenForCall = getSessionToken(storeIdForCall);
        const marketplaceConfig = getMarketplaceConfig();
        const callHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-cart-ids': xCartIdsForCall,
          'x-marketplace-config': JSON.stringify(marketplaceConfig)
        };
        if (tokenForCall) callHeaders['Authorization'] = `Bearer ${tokenForCall}`;

        const response = await fetch('/api/mcp-transport/http', {
          method: 'POST',
          headers: callHeaders,
          credentials: 'include',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: messageId || `ui-action-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: payload.toolName,
              arguments: payload.params || {},
            },
          }),
        });

        const result = await response.json();

        if (payload.toolName === 'addToCart') {
          try {
            const text = result?.result?.content?.[0]?.text;
            if (text) {
              const responseData = JSON.parse(text);
              if (!responseData.error && responseData.cart?.id) {
                const storeId = responseData.storeId;
                const cartId = responseData.cart.id;
                const thinkingMessageId = `thinking-${Date.now()}`;
                stop();
                setMessages((currentMessages) => [...currentMessages, {
                  id: thinkingMessageId,
                  role: 'assistant',
                  parts: [],
                } as any]);

                Promise.resolve().then(async () => {
                  try {
                    const viewCartResponse = await fetch('/api/mcp-transport/http', {
                      method: 'POST',
                      headers: callHeaders,
                      credentials: 'include',
                      body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: `view-cart-${Date.now()}`,
                        method: 'tools/call',
                        params: {
                          name: 'viewCart',
                          arguments: { storeId, cartId },
                        },
                      }),
                    });
                    const viewCartResult = await viewCartResponse.json();
                    if (viewCartResult.result) {
                      setMessages((currentMessages) =>
                        currentMessages.map(msg =>
                          msg.id === thinkingMessageId
                            ? {
                                id: `msg-${Date.now()}`,
                                role: 'assistant',
                                parts: [{
                                  type: 'dynamic-tool',
                                  toolCallId: `call_${Date.now()}`,
                                  toolName: 'viewCart',
                                  input: { storeId, cartId },
                                  state: 'output-available',
                                  output: viewCartResult.result,
                                }],
                              } as any
                            : msg
                        )
                      );
                    }
                  } catch (e) {
                    setMessages((currentMessages) => currentMessages.filter(msg => msg.id !== thinkingMessageId));
                  }
                });
              }
            }
          } catch (e) {}
        }

        if (['initiatePaymentSession', 'discoverProducts', 'loginUser'].includes(payload.toolName)) {
          stop();
          const toolCallId = `call_${Date.now()}`;
          setMessages((currentMessages) => [...currentMessages, {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            parts: [{
              type: 'dynamic-tool',
              toolCallId,
              toolName: payload.toolName,
              input: payload.params,
              state: 'output-available',
              output: result.result,
            }],
          } as any]);
        }

        return result.result;
      } catch (error) {
        console.error('[handleUiAction] Error calling MCP tool:', error);
        throw error;
      }
    } else if (type === 'prompt') {
      if (sendMessage) sendMessage({ text: payload.prompt });
      return Promise.resolve({ status: 'ok' });
    }
    return Promise.resolve({ status: 'ok' });
  }, [sendMessage, stop, setMessages, messages]);

  return (
    <div className={`text-base flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={cn("break-words overflow-hidden min-w-0", message.role === "user" ? "max-w-[calc(100%-2rem)] bg-muted text-foreground px-4 py-2 rounded-md" : "w-[90%] flex flex-col space-y-3")}>
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words">
            {message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')}
          </p>
        ) : (
          <div className="space-y-3 w-full">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return part.text ? (
                    <div key={`message-part-${i}`} className="space-y-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          p: ({ children }) => <div className="mb-1 last:mb-0 break-words">{children}</div>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-semibold break-all">{children}</a>,
                          ul: ({ children }) => <ul className="mb-1 last:mb-0 pl-2">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-1 last:mb-0 pl-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-0.5">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children, ...props }) => (props as any).inline ? <code className="bg-muted px-1 rounded font-mono break-all">{children}</code> : <pre className="bg-muted border rounded p-2 overflow-x-auto"><code className="font-mono break-all">{children}</code></pre>,
                          pre: ({ children }) => <div className="mb-1 last:mb-0">{children}</div>,
                        }}
                      >{part.text}</ReactMarkdown>
                    </div>
                  ) : null;

                case "dynamic-tool":
                case "tool-invocation" as any: {
                  const toolInvocation = part.type === 'dynamic-tool' ? part : (part as any).toolInvocation;
                  const toolName = toolInvocation.toolName || (part.type.startsWith('tool-') ? part.type.slice(5) : 'unknown');
                  const state = toolInvocation.state;
                  const input = toolInvocation.input || (toolInvocation as any).args;
                  const output = toolInvocation.output || (toolInvocation as any).result;

                  const uiResources = output && typeof output === 'object' && output.content && Array.isArray(output.content)
                    ? output.content.filter((content: any) => isUIResource(content))
                    : [];

                  return (
                    <div key={`message-part-${i}`} className="space-y-3">
                      <ToolInvocation
                        toolName={toolName}
                        state={state === 'output-available' ? 'result' : 'call'}
                        args={input}
                        result={output}
                        isLatestMessage={isLatestMessage}
                        status={status}
                        sendMessage={sendMessage}
                      />
                      {uiResources.length > 0 && uiResources.map((content: any, index: number) => (
                        <div key={content.resource?.uri || `ui-resource-${index}`}>
                          <UIResourceRenderer
                            resource={content.resource || content}
                            htmlProps={{
                              autoResizeIframe: { height: true, width: false },
                              style: { width: '100%', minHeight: '425px', border: 'none', borderRadius: '0.375rem' },
                            }}
                            onUIAction={handleUiAction}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
                default:
                  if (part.type.startsWith('tool-')) {
                    const typedPart = part as any;
                    return (
                      <div key={`message-part-${i}`} className="space-y-3">
                        <ToolInvocation
                          toolName={part.type.slice(5)}
                          state={typedPart.state === 'output-available' ? 'result' : 'call'}
                          args={typedPart.input}
                          result={typedPart.output}
                          isLatestMessage={isLatestMessage}
                          status={status}
                          sendMessage={sendMessage}
                        />
                      </div>
                    );
                  }
                  return null;
              }
            })}
            {(!message.parts || message.parts.length === 0) && (
              <div className="flex items-center gap-1 text-muted-foreground"><span className="animate-pulse">Thinking...</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const AIMessage = memo(PureAIMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status || prevProps.isLoading !== nextProps.isLoading || 
      prevProps.isLatestMessage !== nextProps.isLatestMessage || !equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});
