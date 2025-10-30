"use client";

import type { Message as TMessage } from "ai";
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

interface AIMessageProps {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  append: UseChatHelpers["append"];
}

const PureAIMessage = ({
  message,
  isLoading,
  status,
  isLatestMessage,
  append,
}: AIMessageProps) => {
  const handleUiAction = useCallback(async (actionResult: any) => {
    const { messageId, type, payload } = actionResult;

    if (type === 'tool' && payload?.toolName) {
      try {
        console.log('[handleUiAction] Processing tool call:', payload.toolName, 'with messageId:', messageId);

        // SECURITY: For authentication, directly call MCP transport without involving AI
        // Then, persist session, optionally apply pending address, and refresh the cart
        if (payload.toolName === 'authenticateUser') {
          console.log('[handleUiAction] Handling secure authentication request');

          // Build headers: x-cart-ids + Authorization if we already have a session
          let xCartIds = '{}';
          try {
            const carts = getAllCarts();
            const ids: Record<string, string> = {};
            Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
            xCartIds = JSON.stringify(ids);
          } catch {}

          const storeId = payload.params?.storeId;
          const existingToken = getSessionToken(storeId);
          const baseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-cart-ids': xCartIds,
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
          console.log('[handleUiAction] Authentication response:', result);

          let authData: any = null;
          try {
            const text = result?.result?.content?.[0]?.text;
            if (text) authData = JSON.parse(text);
          } catch (e) {
            console.warn('[handleUiAction] Unable to parse auth result JSON');
          }

          // Persist session token and cartId if provided via __clientAction
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

          // If there was address data provided before login, apply it now
          try {
            const pendingAddress = authData?.pendingAddressData;
            const finalCartId = authData?.activeCartId || authData?.__clientAction?.activeCartId || payload.params?.cartId;
            const tokenForEndpoint = getSessionToken(storeId);

            if (storeId && finalCartId && pendingAddress) {
              // Build headers again with x-cart-ids; Authorization optional (cookie from auth is enough)
              let xIds = '{}';
              try {
                const carts = getAllCarts();
                const ids: Record<string, string> = {};
                Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
                xIds = JSON.stringify(ids);
              } catch {}

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-cart-ids': xIds,
              };
              if (tokenForEndpoint) headers['Authorization'] = `Bearer ${tokenForEndpoint}`;

              const addrResp = await fetch('/api/mcp-transport/http', {
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

              const addrResult = await addrResp.json();
              console.log('[handleUiAction] Address applied after login:', addrResult);

              // After applying address, ask AI to show updated cart
              append({ role: 'user', content: 'Show the updated cart' });
            } else if (authData?.message && authData.message.includes('Successfully logged in')) {
              // No address to apply, still refresh cart to show user is logged in
              append({ role: 'user', content: 'Show the updated cart' });
            }
          } catch (e) {
            console.warn('[handleUiAction] Failed to apply address after login:', e);
          }

          return result.result;
        }
        // Special handling: if addToCart is missing cartId, get or create a cart first
        if (payload.toolName === 'addToCart') {
          try {
            const { storeId, countryCode } = payload.params || {};

            // Try to reuse an existing cartId from localStorage first
            if (storeId && !payload?.params?.cartId) {
              const existingCartId = getLocalCartId(storeId);
              if (existingCartId) {
                payload.params = { ...payload.params, cartId: existingCartId };
              }
            }

            // If still no cartId, call getOrCreateCart with x-cart-ids header
            if (storeId && countryCode && !payload?.params?.cartId) {
              // Build x-cart-ids header from localStorage
              let xCartIds = '{}';
              try {
                const carts = getAllCarts();
                const ids: Record<string, string> = {};
                Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
                xCartIds = JSON.stringify(ids);
              } catch {}

              const token = getSessionToken(storeId);
              const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-cart-ids': xCartIds };
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const cartResponse = await fetch('/api/mcp-transport/http', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: messageId || `get-cart-${Date.now()}`,
                  method: 'tools/call',
                  params: {
                    name: 'getOrCreateCart',
                    arguments: { storeId, countryCode },
                  },
                }),
              });

              const cartResult = await cartResponse.json();
              try {
                const text = cartResult?.result?.content?.[0]?.text;
                if (text) {
                  const parsed = JSON.parse(text);
                  const newCartId = parsed?.cart?.id;
                  if (newCartId) {
                    // Save to localStorage for future calls and same-tab listeners
                    saveCartToLocalStorage(storeId, newCartId);
                    payload.params = { ...payload.params, cartId: newCartId };
                    console.log('[handleUiAction] addToCart: resolved cartId via getOrCreateCart:', newCartId);
                  }
                }
              } catch (e) {
                console.warn('[handleUiAction] Could not parse getOrCreateCart response:', e);
              }
            }
          } catch (e) {
            console.warn('[handleUiAction] getOrCreateCart pre-step failed:', e);
          }
        }


        // For all other tools, use the standard flow (cart operations, etc.)
        // Include x-cart-ids header so server can reuse existing carts
        let xCartIdsForCall = '{}';
        try {
          const carts = getAllCarts();
          const ids: Record<string, string> = {};
          Object.entries(carts).forEach(([k, v]: any) => { if (v?.cartId) ids[k] = v.cartId; });
          xCartIdsForCall = JSON.stringify(ids);
        } catch {}

        const storeIdForCall = payload.params?.storeId;
        const tokenForCall = getSessionToken(storeIdForCall);
        const callHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-cart-ids': xCartIdsForCall,
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
        // Persist client-side actions returned by tools (cart/session)
        try {
          const text = result?.result?.content?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            const clientAction = parsed?.__clientAction;

            // Handle saveCartId action
            if (clientAction?.type === 'saveCartId' && clientAction.storeId && clientAction.cartId) {
              console.log('[handleUiAction] Saving cart ID to localStorage:', { storeId: clientAction.storeId, cartId: clientAction.cartId });
              saveCartToLocalStorage(clientAction.storeId, clientAction.cartId);
            }

            // Handle saveSessionToken action
            if (clientAction?.type === 'saveSessionToken' && clientAction.storeId && clientAction.sessionToken) {
              setSession(clientAction.storeId, {
                token: clientAction.sessionToken,
                email: clientAction.email,
                userId: clientAction.userId,
                activeCartId: clientAction.activeCartId,
              });
              if (clientAction.activeCartId) {
                saveCartToLocalStorage(clientAction.storeId, clientAction.activeCartId);
              }
            }
          }
        } catch (e) {
          console.error('[handleUiAction] Error processing __clientAction:', e);
        }

        // For cart modifications from product UI, ask AI to show cart
        if (payload.toolName === 'addToCart') {
          try {
            const text = result?.result?.content?.[0]?.text;
            if (text) {
              const responseData = JSON.parse(text);
              if (!responseData.error && responseData.cart?.id) {
                console.log('[handleUiAction] addToCart successful, asking AI to show cart');
                Promise.resolve().then(() => {
                  append({
                    role: 'user',
                    content: 'Show the updated cart'
                  });
                });
              }
            }
          } catch (e) {
            console.error('[handleUiAction] Error checking addToCart result:', e);
          }
        }

        return result.result;
      } catch (error) {
        console.error('[handleUiAction] Error calling MCP tool:', error);
        throw error;
      }
    } else if (type === 'prompt') {
      // Handle prompt actions (non-tool actions that just send messages)
      if (append) {
        append({
          role: 'user',
          content: payload.prompt,
        });
      }
      return Promise.resolve({ status: 'ok' });
    }

    return Promise.resolve({ status: 'ok' });
  }, [append]);

  return (
    <div
      className={`text-base flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={cn(
          "break-words overflow-hidden min-w-0",
          message.role === "user"
            ? "max-w-[calc(100%-2rem)] bg-muted text-foreground px-4 py-2 rounded-md"
            : "w-[90%] flex flex-col space-y-3"
        )}
      >
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            <div className="space-y-3 w-full">
              {message.parts?.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return part.text ? (
                      <div key={`message-part-${i}`} className="space-y-3">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            p: ({ children }) => (
                              <div className="mb-1 last:mb-0 break-words">
                                {children}
                              </div>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-semibold break-all">
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-1 last:mb-0 pl-2">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-1 last:mb-0 pl-2">{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-0.5">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            code: ({ children, ...props }) => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              if ((props as any).inline) {
                                return (
                                  <code className="bg-muted px-1 rounded font-mono break-all">
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <pre className="bg-muted border rounded p-2 overflow-x-auto">
                                  <code className="font-mono break-all">
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                            pre: ({ children }) => (
                              <div className="mb-1 last:mb-0">{children}</div>
                            ),
                          }}
                        >
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    ) : null;

                  case "tool-invocation": {
                    const { toolName, state, args } = part.toolInvocation;
                    const result = 'result' in part.toolInvocation ? part.toolInvocation.result : null;

                    // Extract UI resources to render outside the tool invocation
                    const uiResources = result &&
                      typeof result === 'object' &&
                      result.content &&
                      Array.isArray(result.content)
                      ? result.content.filter((content: any) => isUIResource(content))
                      : [];

                    return (
                      <div key={`message-part-${i}`} className="space-y-3">
                        <ToolInvocation
                          toolName={toolName}
                          state={state}
                          args={args}
                          result={result}
                          isLatestMessage={isLatestMessage}
                          status={status}
                          append={append}
                        />
                        {/* Render UI resources outside the tool invocation */}
                        {uiResources.length > 0 && uiResources.map((content: any, index: number) => (
                          <div key={content.resource?.uri || `ui-resource-${index}`}>
                            <UIResourceRenderer
                              resource={content.resource}
                              htmlProps={{
                                autoResizeIframe: {
                                  height: true,
                                  width: false,
                                },
                                style: {
                                  width: '100%',
                                  minHeight: '425px',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                },
                              }}
                              onUIAction={handleUiAction}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  }

                  default:
                    return null;
                }
              })}

              {/* Show thinking indicator if assistant message is empty */}
              {(!message.parts || message.parts.length === 0) && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const AIMessage = memo(PureAIMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false;
  if (prevProps.append !== nextProps.append) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});
