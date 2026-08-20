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
import { getAllCarts } from '@/lib/cart-storage';
import { getSessionToken, setSession } from '@/lib/session-storage';
import { getMarketplaceConfig } from '@/lib/marketplace-storage';
import { LoadingState } from '@/components/beautiful-ui/loading-state';
import { useTheme } from 'next-themes';
import {
  applyCartLifecycleFromToolResult,
  getCartIdentityFromToolResult,
  getMcpToolResultData,
  isCartMutationTool,
  serializeCartMutation,
} from '@/lib/cart-client-actions';
import { isPermittedMcpUiAction } from '@/lib/mcp-action-policy';

const TOOLS_THAT_APPEND_CHAT_UI = new Set([
  'addToCart',
  'authenticateUser',
  'discoverProducts',
  'discoverRestaurantMenus',
  'getProduct',
  'initiatePaymentSession',
  'loginUser',
]);

interface AIMessageProps {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  sendMessage: UseChatHelpers<TMessage>["sendMessage"];
  stop: UseChatHelpers<TMessage>["stop"];
  setMessages: UseChatHelpers<TMessage>["setMessages"];
  messages: TMessage[];
  beginFollowingLatest: () => () => void;
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
  beginFollowingLatest,
}: AIMessageProps) => {
  const { resolvedTheme } = useTheme();

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
      // No global UCP mode needed
      const viewCartHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-cart-ids': xCartIds,
        'x-marketplace-config': JSON.stringify(marketplaceConfig),
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

  const handleUiAction = useCallback(async (actionResult: any, resourceUri?: string) => {
    const { messageId, type, payload } = actionResult;
    if (type === 'tool' && !isPermittedMcpUiAction(resourceUri, payload?.toolName, payload?.params)) {
      console.warn('[MCP UI] Rejected an action outside the resource capability.', resourceUri);
      return undefined;
    }
    const shouldFollowLatest = type === 'prompt' || (
      type === 'tool' && TOOLS_THAT_APPEND_CHAT_UI.has(payload?.toolName)
    );
    const finishFollowingLatest = shouldFollowLatest ? beginFollowingLatest() : null;

    try {
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
          // No global UCP mode needed
          const baseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-cart-ids': xCartIds,
            'x-marketplace-config': JSON.stringify(marketplaceConfig),
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
          applyCartLifecycleFromToolResult(result);
          const authData: any = getMcpToolResultData(result);

          try {
            const ca = authData?.__clientAction;
            if (ca?.type === 'saveSessionToken' && ca.sessionToken && storeId) {
              setSession(storeId, {
                token: ca.sessionToken,
                email: ca.email,
                userId: ca.userId,
                activeCartId: ca.activeCartId,
              });
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

        const storeIdForCall = payload.params?.storeId || '';
        const executeToolCall = async () => {
          let xCartIdsForCall = '{}';
          try {
            const carts = getAllCarts();
            const ids: Record<string, string> = {};
            Object.entries(carts).forEach(([key, value]: any) => {
              if (value?.cartId) ids[key] = value.cartId;
            });
            xCartIdsForCall = JSON.stringify(ids);
          } catch {}

          const tokenForCall = getSessionToken(storeIdForCall);
          const marketplaceConfig = getMarketplaceConfig();
          const callHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-cart-ids': xCartIdsForCall,
            'x-marketplace-config': JSON.stringify(marketplaceConfig),
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
          applyCartLifecycleFromToolResult(result);
          return { result, callHeaders };
        };

        const { result, callHeaders } = isCartMutationTool(payload.toolName)
          ? await serializeCartMutation(storeIdForCall, executeToolCall)
          : await executeToolCall();

        if (payload.toolName === 'addToCart') {
          try {
            const responseData = getMcpToolResultData(result);
            const cartIdentity = getCartIdentityFromToolResult(result);
            if (responseData && !responseData.error && cartIdentity) {
              const { storeId, cartId } = cartIdentity;
              const thinkingMessageId = `thinking-${Date.now()}`;
              stop();
              setMessages((currentMessages) => [...currentMessages, {
                id: thinkingMessageId,
                role: 'assistant',
                parts: [],
              } as any]);

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
                } else {
                  setMessages((currentMessages) => currentMessages.filter(msg => msg.id !== thinkingMessageId));
                }
              } catch {
                setMessages((currentMessages) => currentMessages.filter(msg => msg.id !== thinkingMessageId));
              }
            } else if (result?.error) {
              stop();
              setMessages((currentMessages) => [...currentMessages, {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                parts: [{
                  type: 'text',
                  text: 'This restaurant is not accepting Marketplace cart requests right now. Try another restaurant source.',
                }],
              } as any]);
            }
          } catch {}
        }

        const responseData = getMcpToolResultData(result);
        if (
          ['discoverProducts', 'discoverRestaurantMenus', 'loginUser', 'getProduct'].includes(payload.toolName) ||
          (payload.toolName === 'initiatePaymentSession' && !responseData?.error)
        ) {
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
    } finally {
      finishFollowingLatest?.();
    }
  }, [sendMessage, stop, setMessages, messages, beginFollowingLatest]);

  return (
    <div className={cn("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}>
      <div className={cn("min-w-0 break-words", message.role === "user" ? "max-w-[calc(100%-3.5rem)] rounded-xl bg-field px-3 py-1.5 text-[13px] leading-[1.4] text-ink sm:max-w-[72%]" : "w-full space-y-2.5")}>
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words">
            {message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')}
          </p>
        ) : (
          <div className="w-full space-y-2">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return part.text ? (
                    <div
                      key={`message-part-${i}`}
                      className="flex w-full flex-col gap-1.5"
                      style={{ animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both" }}
                    >
                      <div className="text-[12px] font-medium leading-[1.3] text-ink">
                        Assistant
                      </div>
                      <div className="text-[13px] leading-normal text-ink">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            p: ({ children }) => <div className="mb-1.5 last:mb-0 break-words">{children}</div>,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-signal-ink underline decoration-signal/30 underline-offset-2 hover:decoration-signal break-all">{children}</a>,
                            ul: ({ children }) => <ul className="mb-1.5 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-1.5 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                            code: ({ children, ...props }) => (props as any).inline ? <code className="rounded-[4px] bg-inset px-1 py-0.5 font-mono text-[11.5px] break-all">{children}</code> : <pre className="overflow-x-auto rounded-control bg-inset p-3 shadow-hairline"><code className="font-mono text-[11.5px] break-all">{children}</code></pre>,
                            pre: ({ children }) => <div className="mb-1 last:mb-0">{children}</div>,
                          }}
                        >{part.text}</ReactMarkdown>
                      </div>
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
                      />
                      {uiResources.length > 0 && uiResources.map((content: any, index: number) => {
                        const resource = content.resource || content;
                        const isFlushCommerceResource = ['/cart/', '/product/', '/discover-products'].some((path) =>
                          resource?.uri?.includes(path)
                        );

                        return (
                          <div
                            key={resource?.uri || `ui-resource-${index}`}
                            className={cn(
                              "overflow-hidden bg-surface",
                              !isFlushCommerceResource && "rounded-card shadow-card"
                            )}
                          >
                            <UIResourceRenderer
                              resource={resource}
                              htmlProps={{
                                autoResizeIframe: { height: true, width: false },
                                iframeRenderData: { theme: resolvedTheme || 'light' },
                                style: { display: 'block', width: '100%', height: '1px', overflow: 'hidden', border: 'none', borderRadius: isFlushCommerceResource ? '0' : '10px', background: 'var(--surface)', colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light' },
                              }}
                              onUIAction={(action) => handleUiAction(action, resource?.uri)}
                            />
                          </div>
                        );
                      })}
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
                        />
                      </div>
                    );
                  }
                  return null;
              }
            })}
            {(!message.parts || message.parts.length === 0) && (
              <LoadingState label="Thinking" variant="Drive" />
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
