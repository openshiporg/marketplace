"use client";

import type { UIMessage as TMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { memo, useCallback, useId } from "react";
import equal from "fast-deep-equal";
import { Streamdown, type Components } from "streamdown";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "./tool-invocation";
import { UIResourceRenderer, isUIResource } from '@mcp-ui/client';
import { setSession } from '@/lib/session-storage';
import { getMarketplaceConfig } from '@/lib/marketplace-storage';
import { buildMarketplaceMcpHeaders } from '@/lib/mcp-client-headers';
import { LoadingState } from '@/components/beautiful-ui/loading-state';
import { useTheme } from 'next-themes';
import {
  applyCartLifecycleFromToolResult,
  getCartIdentityFromToolResult,
  getMcpToolResultData,
  isCartMutationTool,
  serializeCartMutation,
} from '@/lib/cart-client-actions';
import { isPermittedMcpUiAction, isPermittedMcpUiPrompt } from '@/lib/mcp-action-policy';

function AssistantSparkleIcon({ className = "size-3.5" }: { className?: string }) {
  const gradientId = `assistant-sparkle-${useId().replaceAll(":", "")}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--signal-ink)" />
          <stop offset="1" stopColor="var(--signal)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z" />
    </svg>
  );
}

const TOOLS_THAT_APPEND_CHAT_UI = new Set([
  'addToCart',
  'authenticateUser',
  'discoverMarketplace',
  'discoverProducts',
  'discoverRestaurantMenus',
  'getProduct',
  'initiatePaymentSession',
  'loginUser',
]);

const markdownRemend = { linkMode: "text-only" as const };

const markdownComponents = {
  p: ({ children }) => <p className="min-w-0 break-words">{children}</p>,
  a: ({ href, children }) => !href || href === "streamdown:incomplete-link" ? (
    <span className="break-words">{children}</span>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words font-medium text-signal-ink underline decoration-signal/30 underline-offset-2 transition-colors duration-150 hover:decoration-signal"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="min-w-0 list-outside list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="min-w-0 list-outside list-decimal space-y-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="min-w-0 pl-0 [overflow-wrap:anywhere] [&>p]:inline">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  h1: ({ children }) => <h1 className="font-semibold leading-normal text-ink">{children}</h1>,
  h2: ({ children }) => <h2 className="font-semibold leading-normal text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold leading-normal text-ink">{children}</h3>,
  inlineCode: ({ children }) => (
    <code className="rounded-[4px] bg-inset px-1 py-0.5 font-mono text-[1em] [overflow-wrap:anywhere]">
      {children}
    </code>
  ),
  code: ({ children, className, ...props }) => {
    if (!("data-block" in props)) {
      return (
        <code className="rounded-[4px] bg-inset px-1 py-0.5 font-mono text-[1em] [overflow-wrap:anywhere]">
          {children}
        </code>
      );
    }

    return (
      <pre
        className="my-1 max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-control bg-inset p-3 shadow-hairline"
        tabIndex={0}
      >
        <code className={cn("block min-w-max whitespace-pre font-mono text-[13px] leading-5 text-ink", className)}>
          {children}
        </code>
      </pre>
    );
  },
} satisfies Components;

export function AssistantMarkdown({
  children,
  isStreaming = false,
}: {
  children: string;
  isStreaming?: boolean;
}) {
  return (
    <div
      className="min-w-0 text-[13px] leading-[1.55] text-ink"
      data-assistant-markdown=""
    >
      <Streamdown
        className="min-w-0 space-y-3"
        components={markdownComponents}
        controls={false}
        isAnimating={isStreaming}
        lineNumbers={false}
        remend={markdownRemend}
        skipHtml
      >
        {children}
      </Streamdown>
    </div>
  );
}

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
  hideToolInvocation?: boolean;
  onPromptAction?: () => void;
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
  hideToolInvocation = false,
  onPromptAction,
}: AIMessageProps) => {
  const { resolvedTheme } = useTheme();

  const callViewCartDirectly = async (storeId: string, cartId: string) => {
    try {
      const viewCartResponse = await fetch('/api/mcp-transport/http', {
        method: 'POST',
        headers: buildMarketplaceMcpHeaders(storeId),
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
      if (!viewCartResponse.ok || viewCartResult.error || !viewCartResult.result) {
        throw new Error('Cart could not be displayed');
      }

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
      console.warn('[MCP UI] Rejected an action outside the resource capability.');
      return undefined;
    }
    if (type === 'prompt' && !isPermittedMcpUiPrompt(resourceUri, payload?.prompt)) {
      console.warn('[MCP UI] Rejected an unscoped or sensitive prompt action.');
      return { status: 'rejected' };
    }
    const shouldFollowLatest = type === 'prompt' || (
      type === 'tool' && TOOLS_THAT_APPEND_CHAT_UI.has(payload?.toolName)
    );
    const finishFollowingLatest = shouldFollowLatest ? beginFollowingLatest() : null;

    try {
    if (type === 'tool' && payload?.toolName) {
      try {
        if (payload.toolName === 'authenticateUser') {
          const storeId = payload.params?.storeId;

          const response = await fetch('/api/mcp-transport/http', {
            method: 'POST',
            headers: buildMarketplaceMcpHeaders(storeId),
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
            if (storeId && finalCartId && pendingAddress) {
              await fetch('/api/mcp-transport/http', {
                method: 'POST',
                headers: buildMarketplaceMcpHeaders(storeId),
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
          const response = await fetch('/api/mcp-transport/http', {
            method: 'POST',
            headers: buildMarketplaceMcpHeaders(storeIdForCall),
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
          return result;
        };

        const result = isCartMutationTool(payload.toolName)
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
                  headers: buildMarketplaceMcpHeaders(storeId),
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
            } else if (result?.error || responseData?.error) {
              const store = getMarketplaceConfig().find(candidate => candidate.id === storeIdForCall);
              const message = result?.error?.data?.code === 'INVALID_TOOL_ARGUMENTS'
                ? 'Marketplace rejected this add-to-cart request before it reached the store. This is a Marketplace problem, not the store; please report it.'
                : store?.platform === 'openfront-restaurant'
                ? 'This restaurant is not accepting Marketplace cart requests right now. Try another restaurant source.'
                : 'This store could not add that item to its cart right now. Please try again.';
              stop();
              setMessages((currentMessages) => [...currentMessages, {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                parts: [{
                  type: 'text',
                  text: message,
                }],
              } as any]);
            }
          } catch {}
        }

        const responseData = getMcpToolResultData(result);
        const hasUiResource = Array.isArray(result?.result?.content)
          && result.result.content.some((content: unknown) => isUIResource(content as any));
        if (
          ['discoverMarketplace', 'discoverProducts', 'discoverRestaurantMenus', 'loginUser', 'getProduct'].includes(payload.toolName) ||
          (payload.toolName === 'setShippingAddress' && hasUiResource) ||
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
      onPromptAction?.();
      if (sendMessage) sendMessage({ text: payload.prompt });
      return Promise.resolve({ status: 'ok' });
    }
    return Promise.resolve({ status: 'ok' });
    } finally {
      finishFollowingLatest?.();
    }
  }, [sendMessage, stop, setMessages, messages, beginFollowingLatest, onPromptAction]);

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
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold leading-[1.3]">
                        <AssistantSparkleIcon />
                        <span className="bg-[linear-gradient(135deg,var(--signal-ink)_0%,var(--signal)_100%)] bg-clip-text text-transparent">
                          Assistant
                        </span>
                      </div>
                      <AssistantMarkdown isStreaming={status === "streaming" && isLatestMessage}>
                        {part.text}
                      </AssistantMarkdown>
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
                      {!hideToolInvocation && (
                        <ToolInvocation
                          toolName={toolName}
                          state={state === 'output-available' ? 'result' : 'call'}
                          args={input}
                          result={output}
                          isLatestMessage={isLatestMessage}
                          status={status}
                        />
                      )}
                      {uiResources.length > 0 && uiResources.map((content: any, index: number) => {
                        const resource = content.resource || content;

                        return (
                          <div
                            key={resource?.uri || `ui-resource-${index}`}
                            className="overflow-hidden rounded-[12px] bg-surface shadow-card"
                          >
                            <UIResourceRenderer
                              resource={resource}
                              htmlProps={{
                                autoResizeIframe: { height: true, width: false },
                                iframeRenderData: { theme: resolvedTheme || 'light' },
                                style: { display: 'block', width: '100%', height: '1px', overflow: 'hidden', border: 'none', borderRadius: '12px', background: 'var(--surface)', colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light' },
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
      prevProps.isLatestMessage !== nextProps.isLatestMessage ||
      prevProps.hideToolInvocation !== nextProps.hideToolInvocation ||
      prevProps.onPromptAction !== nextProps.onPromptAction ||
      !equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});
