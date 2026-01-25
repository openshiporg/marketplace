"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "../features/marketplace/components/dual-sidebar/chat-container";
import { ScrollButton } from "../features/marketplace/components/dual-sidebar/scroll-button";
import { ArrowUp, Search, ShoppingCart } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";

// UI Components
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { checkSharedKeysAvailable } from "@/features/marketplace/actions/ai-chat";
import { ModeSplitButton } from "../features/marketplace/components/dual-sidebar/mode-split-button";
import { useAiConfig } from "../features/marketplace/hooks/use-ai-config";
import { setCartId as saveCartToLocalStorage, removeCartId } from "@/lib/cart-storage";
import { getAllSessions } from "@/lib/session-storage";
import { getMarketplaceConfig } from "@/lib/marketplace-storage";
import { AIActivationDialog } from "../features/marketplace/components/dual-sidebar/ai-activation-dialog";
import { AISettingsDialog } from "../features/marketplace/components/dual-sidebar/ai-settings-dialog";
import { ChatUnactivatedState } from "../features/marketplace/components/dual-sidebar/chat-unactivated-state";
import { AIMessage } from "../features/marketplace/components/ai-message";
import { PromptSuggestions } from "../features/marketplace/components/dual-sidebar/prompt-suggestions";
import { CartsDropdown } from "../features/marketplace/components/dual-sidebar/carts-dropdown";
import { LogoIcon as OpenFrontIcon } from "@/components/OpenfrontLogo";
import { LogoIcon as OpenShipIcon } from "@/components/OpenshipLogo";
import { LogoIcon as OpenSupportIcon } from "@/components/OpensupportLogo";

// Main AI Chat Page Component
export default function HomePage() {
  const [user] = useState<{ name?: string } | null>(null);
  const { config: aiConfig, sharedKeys } = useAiConfig();
  const savedCartIds = useRef<Set<string>>(new Set()); 
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
    const marketplaceConfig = getMarketplaceConfig();
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
      marketplaceConfig: getMarketplaceConfig(),
    };
  }, [aiConfig.keyMode, aiConfig.localKeys, cartIdsState, sessionTokensState]);

  const { messages, status, sendMessage, stop, setMessages } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/completion",
        body: chatBody,
      }),
      onError: (error) => {
        console.error("Chat error:", error);
      },
    });

  const isLoading = status === 'streaming' || status === 'submitted';

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

  const handleSuggestionClick = async (suggestion: string) => {
    if (suggestion.toLowerCase().includes("show me products")) {
      stop();
      try {
        const marketplaceConfig = getMarketplaceConfig();
        const discoverResponse = await fetch('/api/mcp-transport/http', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-marketplace-config': JSON.stringify(marketplaceConfig),
          },
          credentials: 'include',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `discover-products-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'discoverProducts',
              arguments: {},
            },
          }),
        });
        const discoverResult = await discoverResponse.json();
        if (discoverResult.result) {
          const toolCallId = `call_${Date.now()}`;
          setMessages([...messages, {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            parts: [{
              type: 'dynamic-tool',
              toolCallId,
              toolName: 'discoverProducts',
              input: {},
              state: 'output-available',
              output: discoverResult.result,
            }],
          } as any]);
        }
      } catch (error) {
        console.error('[handleSuggestionClick] Error calling discoverProducts directly:', error);
        sendMessage({ text: suggestion });
      }
    } else {
      sendMessage({ text: suggestion });
    }
  };

  const handleCartSelect = async (storeName: string, storeId: string) => {
    stop();
    let cartId = cartIdsState[storeId];
    try {
      const marketplaceConfig = getMarketplaceConfig();
      let xCartIds = '{}';
      try {
        const ids: Record<string, string> = {};
        Object.entries(cartIdsState).forEach(([k, v]) => { if (v) ids[k] = v; });
        xCartIds = JSON.stringify(ids);
      } catch {}
      const sessionTokens = getAllSessions();
      const token = sessionTokens[storeId];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-cart-ids': xCartIds,
        'x-marketplace-config': JSON.stringify(marketplaceConfig),
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (!cartId) {
        const createCartResponse = await fetch('/api/mcp-transport/http', {
          method: 'POST',
          headers,
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
        if (createCartResult.result?.content?.[0]?.text) {
          const cartData = JSON.parse(createCartResult.result.content[0].text);
          cartId = cartData.cart?.id;
          if (cartData.__clientAction?.type === 'saveCartId' && cartData.__clientAction.cartId) {
            cartId = cartData.__clientAction.cartId;
            saveCartToLocalStorage(storeId, cartId);
          }
        }
        if (!cartId) throw new Error('Failed to create or retrieve cart');
      }

      const viewCartResponse = await fetch('/api/mcp-transport/http', {
        method: 'POST',
        headers,
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
            try {
              const result = typeof part.output === 'string' ? JSON.parse(part.output) : part.output;
              if (result.content?.[0]?.text) {
                const parsedText = JSON.parse(result.content[0].text);
                if (parsedText.clearCartId && parsedText.storeId) {
                  removeCartId(parsedText.storeId);
                }
                if (parsedText.__clientAction?.type === 'saveCartId') {
                  const { storeId, cartId } = parsedText.__clientAction;
                  if (storeId && cartId) {
                    const cacheKey = `${storeId}:${cartId}`;
                    if (!savedCartIds.current.has(cacheKey)) {
                      saveCartToLocalStorage(storeId, cartId);
                      savedCartIds.current.add(cacheKey);
                    }
                  }
                }
              }
            } catch (e) {}
          }
        });
      }
    });
  }, [messages]);

  const isAiChatReady = aiConfig.enabled && aiConfig.onboarded && selectedMode !== "disabled";
  if (isInitializing) return null;
  const showOnboarding = isAiChatReady && messages.length === 0;

  return (
    <div className="flex flex-col h-dvh relative bg-background">
      {isAiChatReady ? (
        <div className={cn(
          "@container/main relative z-10 flex flex-1 min-h-0 w-full flex-col items-center justify-end md:justify-center overflow-x-hidden pt-16"
        )}>
          <AnimatePresence initial={false} mode="popLayout">
            {showOnboarding ? (
              <motion.div
                key="onboarding"
                className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout="position"
                layoutId="onboarding"
              >
                <div className="mb-4 sm:mb-6 flex flex-col items-center px-4">
                  <div className="flex flex-col items-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                    <OpenFrontIcon className="size-5 sm:size-8" suffix="-hero-top" />
                    <div className="flex items-center gap-2 sm:gap-3">
                      <OpenShipIcon className="size-5 sm:size-8" suffix="-hero-left" />
                      <OpenSupportIcon className="size-5 sm:size-8" suffix="-hero-right" />
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-center bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent font-instrument-serif">
                    the / marketplace
                  </h1>
                </div>
                <p className="text-base sm:text-2xl opacity-60 text-center mb-6 sm:mb-8 font-instrument-serif px-4">
                  Discover products • Shop seamlessly • Checkout instantly
                </p>
              </motion.div>
            ) : (
              <ChatContainerRoot key="conversation" className="relative flex-1 w-full min-h-0">
                <ChatContainerContent className="flex w-full flex-col items-center pt-3 pb-4">
                  <div className="w-full max-w-3xl px-2 space-y-3">
                    {messages.map((message, index) => (
                      <AIMessage
                        key={index}
                        message={message}
                        isLoading={isLoading}
                        status={status}
                        isLatestMessage={index === messages.length - 1}
                        sendMessage={sendMessage as any}
                        stop={stop}
                        setMessages={setMessages}
                        messages={messages}
                      />
                    ))}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                      <div className="text-base flex justify-start">
                        <div className="w-[90%] flex flex-col space-y-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="animate-pulse">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <ChatContainerScrollAnchor />
                  <div className="absolute bottom-4 right-4">
                    <ScrollButton />
                  </div>
                </ChatContainerContent>
              </ChatContainerRoot>
            )}
          </AnimatePresence>

          <motion.div
            className={cn("sticky inset-x-0 bottom-0 z-0 w-full flex justify-center")}
            layout="position"
            layoutId="chat-input-container"
          >
            <div className="relative flex w-full flex-col gap-4 px-2 pb-3 sm:pb-4 max-w-3xl">
              {showOnboarding && (
                <div className="relative order-1 w-full md:absolute md:bottom-[-70px] md:order-2 md:h-[70px] md:left-0 md:right-0 md:px-2">
                  <PromptSuggestions onSuggestionClick={handleSuggestionClick} />
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); if (input.trim()) { sendMessage({ text: input }); setInput(""); } }}
                className="order-2 md:order-1 group flex flex-col w-full"
              >
                <div className="border flex flex-col items-center justify-center p-[6.71px] relative w-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-[28px] shadow-lg">
                  <div className="bg-white dark:bg-gray-950 relative rounded-[23.49px] shadow-[0px_0px_0.492px_0px_rgba(0,0,0,0.18),0px_0.984px_2.953px_0px_rgba(0,0,0,0.1)] w-full p-2 sm:p-3">
                    <div className="flex flex-row items-start gap-1 sm:gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        className="grow resize-none border-0 bg-transparent p-2 text-base outline-none ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isLoading}
                        rows={3}
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                    <div className="flex items-center justify-between border-t-0 p-0 pt-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <ModeSplitButton
                          disabled={isLoading}
                          onSettingsClick={() => setShowSettingsDialog(true)}
                          sharedKeys={sharedKeys}
                        />
                        <CartsDropdown
                          cartIds={cartIdsState}
                          onCartSelect={handleCartSelect}
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="size-8 sm:size-9 rounded-full bg-primary text-primary-foreground flex-shrink-0"
                      >
                        {isLoading ? (
                          <svg className="animate-spin size-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 -960 960 960" fill="currentColor"><path d="M442.39-616.87 309.78-487.26q-11.82 11.83-27.78 11.33t-27.78-12.33q-11.83-11.83-11.83-27.78 0-15.96 11.83-27.79l198.43-199q11.83-11.82 28.35-11.82t28.35 11.82l198.43 199q11.83 11.83 11.83 27.79 0 15.95-11.83 27.78-11.82 11.83-27.78 11.83t-27.78-11.83L521.61-618.87v348.83q0 16.95-11.33 28.28-11.32 11.33-28.28 11.33t-28.28-11.33q-11.33-11.33-11.33-28.28z"/></svg>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <ChatUnactivatedState
            userName={user?.name}
            onActivate={handleActivationOpen}
          />
        </div>
      )}
      <AIActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} onComplete={handleActivationComplete} sharedKeysStatus={sharedKeysStatus} />
      <AISettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} onSave={handleSettingsSave} sharedKeysStatus={sharedKeysStatus} />
    </div>
  );
}
