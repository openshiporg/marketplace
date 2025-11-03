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
import { AnimatePresence, motion } from "framer-motion";

// UI Components
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { checkSharedKeysAvailable, getSharedKeys } from "@/features/marketplace/actions/ai-chat";
import { ModeSplitButton } from "../features/marketplace/components/dual-sidebar/mode-split-button";
import { useAiConfig } from "../features/marketplace/hooks/use-ai-config";
import { setCartId as saveCartToLocalStorage } from "@/lib/cart-storage";
import { getAllSessions } from "@/lib/session-storage";
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
  const { config: aiConfig } = useAiConfig();
  const savedCartIds = useRef<Set<string>>(new Set()); // Track which cart IDs we've already saved
  const [cartIdsState, setCartIdsState] = useState<Record<string, string>>({}); // Track cart IDs for body
  const [sessionTokensState, setSessionTokensState] = useState<Record<string, string>>({}); // Track session tokens for body
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
  const [, setIsLoadingSharedKeys] = useState(true);
  const [sharedKeys, setSharedKeys] = useState<{
    apiKey: string;
    model: string;
    maxTokens: number;
  } | null>(null);

  // Initialize selected mode based on AI config
  useEffect(() => {
    if (aiConfig.enabled) {
      setSelectedMode(aiConfig.keyMode);
    } else {
      setSelectedMode("disabled");
    }
    setIsInitializing(false);
  }, [aiConfig.enabled, aiConfig.keyMode]);

  // Load cart IDs from localStorage on mount and when they change
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
          console.log('[AI Chat] Loaded cart IDs from localStorage:', cartIds);
        }
      } catch (error) {
        console.error('[AI Chat] Error loading cart IDs:', error);
      }
    };

    // Load on mount
    loadCartIds();

    // Listen for storage changes (when carts are added/updated)
    window.addEventListener('storage', loadCartIds);

    // Also listen for custom event when cart is saved within same tab
    const handleCartUpdate = () => loadCartIds();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', loadCartIds);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // Load session tokens from localStorage on mount and when they change
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
        console.log('[AI Chat] Loaded session tokens from localStorage for stores:', Object.keys(tokens));
      } catch (error) {
        console.error('[AI Chat] Error loading session tokens:', error);
      }
    };

    // Load on mount
    loadSessionTokens();

    // Listen for storage changes (when sessions are added/updated)
    window.addEventListener('storage', loadSessionTokens);

    // Also listen for custom event when session is saved within same tab
    const handleSessionUpdate = () => loadSessionTokens();
    window.addEventListener('sessionUpdated', handleSessionUpdate);

    return () => {
      window.removeEventListener('storage', loadSessionTokens);
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, []);

  // Check shared keys status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoadingSharedKeys(true);
        const status = await checkSharedKeysAvailable();
        setSharedKeysStatus(status);
      } catch (error) {
        console.error("Failed to check shared keys status:", error);
      } finally {
        setIsLoadingSharedKeys(false);
      }
    };
    checkStatus();
  }, []);

  // Fetch shared keys when in env mode
  useEffect(() => {
    const fetchSharedKeys = async () => {
      if (aiConfig.keyMode === "env") {
        try {
          const keysResult = await getSharedKeys();
          if (keysResult.success && keysResult.keys) {
            setSharedKeys(keysResult.keys);
          }
        } catch (error) {
          console.error("Failed to fetch shared keys:", error);
        }
      }
    };
    fetchSharedKeys();
  }, [aiConfig.keyMode]);

  // Compute body for useChat based on mode
  const chatBody = useMemo(() => {
    if (aiConfig.keyMode === "local") {
      return {
        useLocalKeys: true,
        provider: aiConfig.localKeys?.provider,
        customEndpoint: aiConfig.localKeys?.customEndpoint,
        apiKey: aiConfig.localKeys?.apiKey,
        model: aiConfig.localKeys?.model,
        maxTokens: aiConfig.localKeys?.maxTokens,
        cartIds: cartIdsState, // Include cart context from state
        sessionTokens: sessionTokensState, // Include session tokens from state
      };
    } else if (aiConfig.keyMode === "env" && sharedKeys) {
      return {
        useLocalKeys: true,
        apiKey: sharedKeys.apiKey,
        model: sharedKeys.model,
        maxTokens: sharedKeys.maxTokens,
        cartIds: cartIdsState, // Include cart context from state
        sessionTokens: sessionTokensState, // Include session tokens from state
      };
    }
    return {
      cartIds: cartIdsState, // Always include cart IDs even if no keys configured
      sessionTokens: sessionTokensState, // Always include session tokens even if no keys configured
    };
  }, [aiConfig.keyMode, aiConfig.localKeys, sharedKeys, cartIdsState, sessionTokensState]);

  // Use the useChat hook from AI SDK
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat({
      api: "/api/completion",
      body: chatBody,
      onError: (error) => {
        console.error("Chat error:", error);
      },
    });

  // Handle activation completion
  const handleActivationComplete = () => {
    setSelectedMode(aiConfig.keyMode);
  };

  // Handle settings save
  const handleSettingsSave = () => {
    setSelectedMode(aiConfig.keyMode);
  };

  // Handle activation dialog open
  const handleActivationOpen = () => {
    setShowActivationDialog(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    append({
      role: "user",
      content: suggestion,
    });
  };

  const handleCartSelect = (storeName: string, storeId: string) => {
    append({
      role: "user",
      content: `Please show me my cart from ${storeName} (storeId: ${storeId})`,
    });
  };

  // Listen for postMessage events from MCP UI (e.g., product cards)
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      // Only process chat-message events
      if (event.data?.type === 'chat-message' && event.data?.message) {
        // Auto-submit the message to the chat
        append({
          role: 'user',
          content: event.data.message,
        });
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [append]);

  // Watch for tool invocations with cart ID actions
  useEffect(() => {
    // Check all messages for tool invocations with createCart results
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.toolInvocations) {
        message.toolInvocations.forEach((invocation: any) => {
          // Check if this is a completed tool invocation with a result
          if (invocation.state === 'result' && invocation.result) {
            try {
              // Parse the result - it might be a string or already an object
              const result = typeof invocation.result === 'string'
                ? JSON.parse(invocation.result)
                : invocation.result;

              console.log('[Cart] Tool invocation result structure:', invocation.toolName, result);

              // The actual data is nested in result.content[0].text as a JSON string
              if (result.content?.[0]?.text) {
                try {
                  const parsedText = JSON.parse(result.content[0].text);
                  console.log('[Cart] Parsed text content:', parsedText);

                  // Check if this result has a __clientAction for saving cart ID
                  if (parsedText.__clientAction?.type === 'saveCartId') {
                    const { storeId, cartId } = parsedText.__clientAction;
                    if (storeId && cartId) {
                      // Check if we've already saved this cart ID to avoid duplicates
                      const cacheKey = `${storeId}:${cartId}`;
                      if (!savedCartIds.current.has(cacheKey)) {
                        console.log('[Cart] Saving cart ID to localStorage:', { storeId, cartId });
                        saveCartToLocalStorage(storeId, cartId);
                        savedCartIds.current.add(cacheKey);
                      }
                    }
                  }
                } catch (parseError) {
                  // Not JSON or not the format we're looking for, ignore
                  console.debug('[Cart] Content is not JSON or not cart action:', result.content[0].text);
                }
              }
            } catch (e) {
              // Not JSON or parse error, ignore
              console.error('[Cart] Error parsing tool result:', e);
            }
          }
        });
      }
    });
  }, [messages]);

  const isAiChatReady =
    aiConfig.enabled && aiConfig.onboarded && selectedMode !== "disabled";

  // Don't render anything while initializing to prevent flash
  if (isInitializing) {
    return null;
  }

  const showOnboarding = isAiChatReady && messages.length === 0;

  // Determine colors based on mode
  const isGlobalMode = aiConfig.keyMode === "env";

  return (
    <div className="flex flex-col h-dvh relative bg-background">
      {/* Clean background like Zola */}

      {/* COMMENTED OUT: Noisy gradient background - uncomment if needed
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-background" />

        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="noiseFilter" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="4"
                stitchTiles="stitch"
                seed="5"
              />
              <feColorMatrix type="saturate" values="0.1" />
            </filter>
          </defs>

          <rect
            width="100%"
            height="100%"
            filter="url(#noiseFilter)"
            opacity="0.3"
          />
        </svg>

        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out dark:block hidden"
          style={{
            background: isGlobalMode
              ? `radial-gradient(circle at 50% 100%,
                  rgba(26, 86, 219, 0.4) 0%,
                  rgba(30, 66, 159, 0.3) 25%,
                  rgba(15, 35, 97, 0.2) 50%,
                  transparent 70%)`
              : `radial-gradient(circle at 50% 100%,
                  rgba(16, 185, 129, 0.4) 0%,
                  rgba(5, 150, 105, 0.3) 25%,
                  rgba(4, 120, 87, 0.2) 50%,
                  transparent 70%)`
          }}
        />

        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out block dark:hidden"
          style={{
            background: isGlobalMode
              ? `radial-gradient(circle at 50% 100%,
                  rgba(26, 86, 219, 0.25) 0%,
                  rgba(30, 66, 159, 0.15) 25%,
                  transparent 50%)`
              : `radial-gradient(circle at 50% 100%,
                  rgba(16, 185, 129, 0.25) 0%,
                  rgba(5, 150, 105, 0.15) 25%,
                  transparent 50%)`
          }}
        />
      </div>
      */}

      {/* Main Content Area - EXACTLY like Vercel: NO page scroll, only messages scroll */}
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
                transition={{
                  layout: {
                    duration: 0,
                  },
                }}
              >
                <div className="mb-4 sm:mb-6 flex flex-col items-center px-4">
                  {/* Triangle arrangement of logos */}
                  <div className="flex flex-col items-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                    {/* Top logo */}
                    <OpenFrontIcon className="size-5 sm:size-8" suffix="-hero-top" />
                    {/* Bottom two logos */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <OpenShipIcon className="size-5 sm:size-8" suffix="-hero-left" />
                      <OpenSupportIcon className="size-5 sm:size-8" suffix="-hero-right" />
                    </div>
                  </div>
                  {/* Marketplace text below */}
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
                        status={isLoading ? "streaming" : "ready"}
                        isLatestMessage={index === messages.length - 1}
                        append={append}
                      />
                    ))}
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
            className={cn(
              "sticky inset-x-0 bottom-0 z-0 w-full flex justify-center"
            )}
            layout="position"
            layoutId="chat-input-container"
            transition={{
              layout: {
                duration: messages.length === 1 ? 0.3 : 0,
              },
            }}
          >
            <div className="relative flex w-full flex-col gap-4 px-2 pb-3 sm:pb-4 max-w-3xl">
              {showOnboarding && (
                <div className="relative order-1 w-full md:absolute md:bottom-[-70px] md:order-2 md:h-[70px] md:left-0 md:right-0 md:px-2">
                  <PromptSuggestions onSuggestionClick={handleSuggestionClick} />
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(e as any); }}
                className="order-2 md:order-1 group flex flex-col w-full"
              >
                {/* Outer card container */}
                <div className="border flex flex-col items-center justify-center p-[6.71px] relative w-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-[28px] shadow-lg">
                  {/* Inner white card - Vercel-style structure */}
                  <div className="bg-white dark:bg-gray-950 relative rounded-[23.49px] shadow-[0px_0px_0.492px_0px_rgba(0,0,0,0.18),0px_0.984px_2.953px_0px_rgba(0,0,0,0.1)] w-full p-2 sm:p-3">
                    {/* Textarea */}
                    <div className="flex flex-row items-start gap-1 sm:gap-2">
                      <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        className="grow resize-none border-0 bg-transparent p-2 text-sm sm:text-base outline-none ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        disabled={isLoading}
                        rows={3}
                        style={{ minHeight: '44px' }}
                      />
                    </div>

                    {/* Toolbar - Vercel style */}
                    <div className="flex items-center justify-between border-t-0 p-0 pt-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <ModeSplitButton
                          disabled={isLoading}
                          onSettingsClick={() => {
                            setShowSettingsDialog(true);
                          }}
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
                        className="size-8 sm:size-9 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex-shrink-0"
                      >
                        {isLoading ? (
                          <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 -960 960 960" fill="currentColor">
                            <path d="M442.39-616.87 309.78-487.26q-11.82 11.83-27.78 11.33t-27.78-12.33q-11.83-11.83-11.83-27.78 0-15.96 11.83-27.79l198.43-199q11.83-11.82 28.35-11.82t28.35 11.82l198.43 199q11.83 11.83 11.83 27.79 0 15.95-11.83 27.78-11.82 11.83-27.78 11.83t-27.78-11.83L521.61-618.87v348.83q0 16.95-11.33 28.28-11.32 11.33-28.28 11.33t-28.28-11.33q-11.33-11.33-11.33-28.28z"/>
                          </svg>
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

      <AIActivationDialog
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onComplete={handleActivationComplete}
      />

      <AISettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        onSave={handleSettingsSave}
      />
    </div>
  );
}
