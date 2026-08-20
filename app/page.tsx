"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "../features/marketplace/components/dual-sidebar/chat-container";
import { ScrollButton } from "../features/marketplace/components/dual-sidebar/scroll-button";
import { ArrowUp } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { LoadingState } from "@/components/beautiful-ui/loading-state";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { checkSharedKeysAvailable } from "@/features/marketplace/actions/ai-chat";
import { ModeSplitButton } from "../features/marketplace/components/dual-sidebar/mode-split-button";
import { useAiConfig } from "../features/marketplace/hooks/use-ai-config";
import {
  applyCartLifecycleFromToolResult,
  getMcpToolResultData,
  serializeCartMutation,
} from "@/lib/cart-client-actions";
import { getAllCarts } from "@/lib/cart-storage";
import { getAllSessions } from "@/lib/session-storage";
import {
  getDefaultMarketplaceConfig,
  getMarketplaceConfig,
  MARKETPLACE_CONFIG_UPDATED_EVENT,
  MARKETPLACE_STORAGE_KEY,
  type MarketplaceStore,
} from "@/lib/marketplace-storage";
import { AIActivationDialog } from "../features/marketplace/components/dual-sidebar/ai-activation-dialog";
import { AISettingsDialog } from "../features/marketplace/components/dual-sidebar/ai-settings-dialog";
import { ChatUnactivatedState } from "../features/marketplace/components/dual-sidebar/chat-unactivated-state";
import { AIMessage } from "../features/marketplace/components/ai-message";
import { PromptSuggestions } from "../features/marketplace/components/dual-sidebar/prompt-suggestions";
import { CartsDropdown } from "../features/marketplace/components/dual-sidebar/carts-dropdown";
import type { StickToBottomContext } from "use-stick-to-bottom";
import type { MarketplaceDiscoveryRequest } from "@/lib/marketplace-discovery";
// Main AI Chat Page Component
export default function HomePage() {
  const [user] = useState<{ name?: string } | null>(null);
  const { config: aiConfig, sharedKeys } = useAiConfig();
  const chatScrollContextRef = useRef<StickToBottomContext | null>(null);
  const [cartIdsState, setCartIdsState] = useState<Record<string, string>>({}); 
  const [sessionTokensState, setSessionTokensState] = useState<Record<string, string>>({}); 
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<
    "env" | "local" | "disabled"
  >("env");
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [sharedKeysStatus, setSharedKeysStatus] = useState<{
    available: boolean;
    missing: { apiKey: boolean; model: boolean; maxTokens: boolean };
  } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [marketplaceConfig, setMarketplaceConfigState] = useState<MarketplaceStore[]>(
    getDefaultMarketplaceConfig
  );

  // The bundled JSON is the initial fallback. Once the user manages stores,
  // keep every chat request synchronized with their localStorage override.
  useEffect(() => {
    const syncMarketplaceConfig = () => {
      setMarketplaceConfigState(getMarketplaceConfig());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MARKETPLACE_STORAGE_KEY) syncMarketplaceConfig();
    };

    syncMarketplaceConfig();
    window.addEventListener(MARKETPLACE_CONFIG_UPDATED_EVENT, syncMarketplaceConfig);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(MARKETPLACE_CONFIG_UPDATED_EVENT, syncMarketplaceConfig);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (aiConfig.enabled) {
      setSelectedMode(aiConfig.keyMode);
    } else {
      setSelectedMode("disabled");
    }
    setIsInitializing(false);
  }, [aiConfig.enabled, aiConfig.keyMode]);

  useEffect(() => {
    const loadCartIds = () => {
      try {
        const cartStorage = localStorage.getItem('openfront_marketplace_carts');
        if (cartStorage) {
          const parsed = JSON.parse(cartStorage);
          const cartIds: Record<string, string> = {};
          Object.entries(parsed).forEach(([endpoint, data]: [string, any]) => {
            if (data?.cartId) {
              cartIds[endpoint] = data.cartId;
            }
          });
          setCartIdsState(cartIds);
        } else {
          setCartIdsState({});
        }
      } catch (error) {
        console.error('[AI Chat] Error loading cart IDs:', error);
      }
    };
    loadCartIds();
    window.addEventListener('storage', loadCartIds);
    const handleCartUpdate = () => loadCartIds();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('storage', loadCartIds);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  useEffect(() => {
    const loadSessionTokens = () => {
      try {
        const sessions = getAllSessions();
        const tokens: Record<string, string> = {};
        Object.entries(sessions).forEach(([storeId, sessionInfo]) => {
          if (sessionInfo?.token) {
            tokens[storeId] = sessionInfo.token;
          }
        });
        setSessionTokensState(tokens);
      } catch (error) {
        console.error('[AI Chat] Error loading session tokens:', error);
      }
    };
    loadSessionTokens();
    window.addEventListener('storage', loadSessionTokens);
    const handleSessionUpdate = () => loadSessionTokens();
    window.addEventListener('sessionUpdated', handleSessionUpdate);
    return () => {
      window.removeEventListener('storage', loadSessionTokens);
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkSharedKeysAvailable();
        setSharedKeysStatus(status);
      } catch (error) {
        console.error("Failed to check shared keys status:", error);
      }
    };
    checkStatus();
  }, []);

  const chatBody = useMemo(() => {
    if (aiConfig.keyMode === "local") {
      return {
        useLocalKeys: true,
        provider: aiConfig.localKeys?.provider,
        customEndpoint: aiConfig.localKeys?.customEndpoint,
        apiKey: aiConfig.localKeys?.apiKey,
        model: aiConfig.localKeys?.model,
        maxTokens: aiConfig.localKeys?.maxTokens,
        cartIds: cartIdsState,
        sessionTokens: sessionTokensState,
        marketplaceConfig,
      };
    } else if (aiConfig.keyMode === "env") {
      return {
        useGlobalKeys: true,
        cartIds: cartIdsState,
        sessionTokens: sessionTokensState,
        marketplaceConfig,
      };
    }
    return {
      cartIds: cartIdsState,
      sessionTokens: sessionTokensState,
      marketplaceConfig,
    };
  }, [aiConfig.keyMode, aiConfig.localKeys, cartIdsState, sessionTokensState, marketplaceConfig]);

  // useChat creates its Chat instance once. Keep one transport and resolve the
  // request body at send time so switching Global/Local never uses stale keys.
  const chatBodyRef = useRef(chatBody);
  chatBodyRef.current = chatBody;
  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: "/api/completion",
    prepareSendMessagesRequest: ({ id, messages, trigger, messageId, body }) => ({
      body: {
        ...body,
        ...chatBodyRef.current,
        id,
        messages,
        trigger,
        messageId,
      },
    }),
  }), []);

  const { messages, status, sendMessage, stop, setMessages } =
    useChat({
      transport: chatTransport,
      onError: (error) => {
        console.error("Chat error:", error);
      },
    });

  const isLoading = status === 'streaming' || status === 'submitted';

  const beginFollowingLatest = useCallback(() => {
    const context = chatScrollContextRef.current;
    if (!context) return () => undefined;

    let finishDuration!: () => void;
    let finished = false;
    const duration = new Promise<void>((resolve) => {
      finishDuration = resolve;
    });

    void context.scrollToBottom({
      animation: "smooth",
      duration,
    });

    return () => {
      if (finished) return;
      finished = true;
      requestAnimationFrame(finishDuration);
    };
  }, []);

  const handleActivationComplete = () => {
    setSelectedMode(aiConfig.keyMode);
  };

  const handleSettingsSave = () => {
    setSelectedMode(aiConfig.keyMode);
  };

  const handleActivationOpen = () => {
    setShowActivationDialog(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMessage({ text: input });
        setInput("");
      }
    }
  };

  const handleSuggestionClick = async ({
    prompt,
    toolName,
    input,
  }: MarketplaceDiscoveryRequest) => {
    stop();
    try {
      const discoverResponse = await fetch('/api/mcp-transport/http', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-marketplace-config': JSON.stringify(getMarketplaceConfig()),
        },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `${toolName}-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: input,
          },
        }),
      });
      if (!discoverResponse.ok) throw new Error('Discovery request failed');

      const discoverResult = await discoverResponse.json();
      if (!discoverResult.result || discoverResult.error) {
        throw new Error('Discovery tool returned no result');
      }

      const timestamp = Date.now();
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `suggestion-${timestamp}`,
          role: 'user',
          parts: [{ type: 'text', text: prompt }],
        } as any,
        {
          id: `msg-${timestamp}`,
          role: 'assistant',
          parts: [{
            type: 'dynamic-tool',
            toolCallId: `call_${timestamp}`,
            toolName,
            input,
            state: 'output-available',
            output: discoverResult.result,
          }],
        } as any,
      ]);
    } catch (error) {
      console.error(`[handleSuggestionClick] Error calling ${toolName} directly:`, error);
      sendMessage({ text: prompt });
    }
  };

  const handleCartSelect = async (storeName: string, storeId: string) => {
    stop();
    const finishFollowingLatest = beginFollowingLatest();

    const buildHeaders = () => {
      const cartIds = Object.fromEntries(
        Object.entries(getAllCarts()).map(([key, value]) => [key, value.cartId])
      );
      const token = getAllSessions()[storeId];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-cart-ids': JSON.stringify(cartIds),
        'x-marketplace-config': JSON.stringify(getMarketplaceConfig()),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    };

    try {
      const cartId = await serializeCartMutation(storeId, async () => {
        const createCartResponse = await fetch('/api/mcp-transport/http', {
          method: 'POST',
          headers: buildHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `get-or-create-cart-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'getOrCreateCart',
              arguments: { storeId, countryCode: 'us' },
            },
          }),
        });
        const createCartResult = await createCartResponse.json();
        const cartChange = applyCartLifecycleFromToolResult(createCartResult);
        const cartData = getMcpToolResultData(createCartResult);
        const resolvedCartId = cartChange?.type === 'saved'
          ? cartChange.cartId
          : typeof (cartData?.cart as { id?: unknown } | undefined)?.id === 'string'
            ? (cartData?.cart as { id: string }).id
            : undefined;

        if (!resolvedCartId) throw new Error('Failed to create or retrieve cart');
        return resolvedCartId;
      });

      const viewCartResponse = await fetch('/api/mcp-transport/http', {
        method: 'POST',
        headers: buildHeaders(),
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
        const toolCallId = `call_${Date.now()}`;
        setMessages([...messages, {
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
    } catch (error) {
      console.error('[handleCartSelect] Error:', error);
      sendMessage({ text: `Please show me my cart from ${storeName} (storeId: ${storeId})` });
    } finally {
      finishFollowingLatest();
    }
  };

  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data?.type === 'chat-message' && event.data?.message) {
        sendMessage({ text: event.data.message });
      }
    };
    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [sendMessage]);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.parts) {
        message.parts.forEach((part: any) => {
          if (part.type === 'dynamic-tool' && part.state === 'output-available' && part.output) {
            applyCartLifecycleFromToolResult(part.output);
          }
        });
      }
    });
  }, [messages]);

  const isAiChatReady = aiConfig.enabled && aiConfig.onboarded && selectedMode !== "disabled";
  if (isInitializing) return null;
  const showOnboarding = isAiChatReady && messages.length === 0;

  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-3rem)] items-center justify-center p-3 sm:p-5",
        isAiChatReady && !showOnboarding &&
          "h-[calc(100dvh-3rem)] min-h-0 items-stretch p-0 sm:h-auto sm:min-h-[calc(100dvh-3rem)] sm:items-center sm:p-5"
      )}
    >
      <section
        className={cn(
          "flex h-[min(580px,calc(100dvh-5rem))] min-h-[480px] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface shadow-card",
          isAiChatReady && !showOnboarding &&
            "h-full min-h-0 rounded-none shadow-none sm:h-[min(580px,calc(100dvh-5rem))] sm:min-h-[480px] sm:rounded-card sm:shadow-card"
        )}
      >
        <div className="flex shrink-0 items-center border-b border-line p-1.5">
          <CartsDropdown cartIds={cartIdsState} onCartSelect={handleCartSelect} disabled={isLoading} />
        </div>

        {isAiChatReady ? (
          <>
            <div className="relative min-h-0 flex-1">
              {showOnboarding ? (
                <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-5">
                  <div className="w-full max-w-110">
                    <div className="mb-4 flex w-full flex-col gap-1.5" style={{ animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both" }}>
                      <h1 className="text-[16px] font-semibold leading-tight tracking-[-0.015em] text-ink">
                        Welcome to the only marketplace you&apos;ll ever need.
                      </h1>
                      <p className="text-[13px] leading-[1.45] text-ink-2">
                        Search for anything, from restaurants in Toronto to hotels in New York, on one open marketplace that connects you directly with stores and sellers through open-source commerce. <a href="/ethos" className="font-medium text-signal-ink underline decoration-signal/30 underline-offset-2 transition-colors hover:text-ink">Read our ethos</a>.
                      </p>
                    </div>
                    <PromptSuggestions onSuggestionClick={handleSuggestionClick} />
                  </div>
                </div>
              ) : (
                <ChatContainerRoot contextRef={chatScrollContextRef} className="relative h-full min-h-0">
                  <ChatContainerContent className="flex w-full flex-col px-3 pb-1 pt-2.5">
                    <div className="w-full space-y-2.5">
                      {messages.map((message, index) => (
                        <AIMessage
                          key={message.id || index}
                          message={message}
                          isLoading={isLoading}
                          status={status}
                          isLatestMessage={index === messages.length - 1}
                          sendMessage={sendMessage as any}
                          stop={stop}
                          setMessages={setMessages}
                          messages={messages}
                          beginFollowingLatest={beginFollowingLatest}
                        />
                      ))}
                      {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                        <LoadingState label="Thinking" variant="Drive" />
                      )}
                    </div>
                    <ChatContainerScrollAnchor />
                    <div className="absolute bottom-2 right-2"><ScrollButton /></div>
                  </ChatContainerContent>
                </ChatContainerRoot>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (input.trim()) {
                  sendMessage({ text: input });
                  setInput("");
                }
              }}
              className={cn(
                "mt-auto shrink-0 p-1.5",
                !showOnboarding && "pb-[max(0.375rem,env(safe-area-inset-bottom))]"
              )}
            >
              <div className="flex cursor-text flex-col gap-2.5 rounded-control border border-line bg-field p-3 shadow-[0_1px_2px_rgba(0,0,0,0.035)] transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for products, menus, or places"
                  disabled={isLoading}
                  rows={1}
                  className="min-h-6 w-full resize-none bg-transparent text-[16px] leading-[1.4] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="flex items-center justify-between gap-2">
                  <ModeSplitButton
                    disabled={isLoading}
                    onSettingsClick={() => setShowSettingsDialog(true)}
                    sharedKeys={sharedKeys}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                    className="size-7 rounded-[5px]"
                  >
                    <ArrowUp className="size-4" strokeWidth={2.4} />
                  </Button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <ChatUnactivatedState userName={user?.name} onActivate={handleActivationOpen} />
          </div>
        )}
      </section>

      <AIActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} onComplete={handleActivationComplete} sharedKeysStatus={sharedKeysStatus} />
      <AISettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} onSave={handleSettingsSave} sharedKeysStatus={sharedKeysStatus} />
    </div>
  );
}
