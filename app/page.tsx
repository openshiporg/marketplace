"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/features/marketplace/components/dual-sidebar/chat-container";
import { ScrollButton } from "@/features/marketplace/components/dual-sidebar/scroll-button";
import { ArrowRight, ArrowUp, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoadingState } from "@/components/beautiful-ui/loading-state";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { checkSharedKeysAvailable } from "@/features/marketplace/actions/ai-chat";
import { ModeSplitButton } from "@/features/marketplace/components/dual-sidebar/mode-split-button";
import { useAiConfig } from "@/features/marketplace/hooks/use-ai-config";
import {
  applyCartLifecycleFromToolResult,
  getMcpToolResultData,
  serializeCartMutation,
} from "@/lib/cart-client-actions";
import { getAllCartIds, getAllCartProofs } from "@/lib/cart-storage";
import { getAllSessions } from "@/lib/session-storage";
import { buildMarketplaceMcpHeaders } from "@/lib/mcp-client-headers";
import {
  getDefaultMarketplaceConfig,
  getMarketplaceConfig,
  MARKETPLACE_CONFIG_UPDATED_EVENT,
  MARKETPLACE_STORAGE_KEY,
  type MarketplaceStore,
} from "@/lib/marketplace-storage";
import { AIActivationDialog } from "@/features/marketplace/components/dual-sidebar/ai-activation-dialog";
import { AISettingsDialog } from "@/features/marketplace/components/dual-sidebar/ai-settings-dialog";
import { ChatUnactivatedState } from "@/features/marketplace/components/dual-sidebar/chat-unactivated-state";
import { AIMessage } from "@/features/marketplace/components/ai-message";
import { CartsDropdown } from "@/features/marketplace/components/dual-sidebar/carts-dropdown";
import { ChatThreadTabs } from "@/features/marketplace/components/dual-sidebar/chat-thread-tabs";
import { PromptSuggestions } from "@/features/marketplace/components/dual-sidebar/prompt-suggestions";
import { useChatThreads } from "@/features/marketplace/hooks/use-chat-threads";
import { MarketplaceSidebar } from "./_components/marketplace-sidebar";
import type { StickToBottomContext } from "use-stick-to-bottom";
import type { MarketplaceDiscoveryRequest } from "@/lib/marketplace-discovery";
// Main AI Chat Page Component
export default function HomePage() {
  const [user] = useState<{ name?: string } | null>(null);
  const { config: aiConfig, sharedKeys } = useAiConfig();
  const {
    threads,
    activeThread,
    activeThreadId,
    isHydrated: areThreadsHydrated,
    createThread,
    selectThread,
    saveThread,
    closeThread,
  } = useChatThreads();
  const chatScrollContextRef = useRef<StickToBottomContext | null>(null);
  const restoredThreadIdRef = useRef<string | null>(null);
  const restoringMessagesSignatureRef = useRef<string | null>(null);
  const latestMessagesRef = useRef<UIMessage[]>([]);
  const activeThreadIdRef = useRef(activeThreadId);
  const inputRef = useRef("");
  const [cartIdsState, setCartIdsState] = useState<Record<string, string>>({});
  const [cartProofsState, setCartProofsState] = useState<Record<string, string>>({});
  const [sessionTokensState, setSessionTokensState] = useState<Record<string, string>>({});
  const [directCartMessage, setDirectCartMessage] = useState<UIMessage | null>(null);
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
        setCartIdsState(getAllCartIds());
        setCartProofsState(getAllCartProofs());
      } catch (error) {
        console.error('[AI Chat] Error loading cart identity:', error);
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
        cartProofs: cartProofsState,
        sessionTokens: sessionTokensState,
        marketplaceConfig,
      };
    } else if (aiConfig.keyMode === "env") {
      return {
        useGlobalKeys: true,
        cartIds: cartIdsState,
        cartProofs: cartProofsState,
        sessionTokens: sessionTokensState,
        marketplaceConfig,
      };
    }
    return {
      cartIds: cartIdsState,
      cartProofs: cartProofsState,
      sessionTokens: sessionTokensState,
      marketplaceConfig,
    };
  }, [aiConfig.keyMode, aiConfig.localKeys, cartIdsState, cartProofsState, sessionTokensState, marketplaceConfig]);

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
        // Read cart credentials synchronously at submission time so a request
        // immediately after refresh cannot race the localStorage effects.
        cartIds: getAllCartIds(),
        cartProofs: getAllCartProofs(),
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
  latestMessagesRef.current = messages;
  activeThreadIdRef.current = activeThreadId;
  inputRef.current = input;

  const restoreThread = useCallback((thread: NonNullable<typeof activeThread>) => {
    restoredThreadIdRef.current = thread.id;
    restoringMessagesSignatureRef.current = JSON.stringify(thread.messages);
    setMessages(thread.messages);
    setInput(thread.draft || '');
    setDirectCartMessage(null);
  }, [setMessages]);

  useEffect(() => {
    if (!areThreadsHydrated || !activeThread) return;
    if (restoredThreadIdRef.current === activeThread.id) return;
    restoreThread(activeThread);
  }, [activeThread, areThreadsHydrated, restoreThread]);

  useEffect(() => {
    if (!areThreadsHydrated || !activeThreadId || restoredThreadIdRef.current !== activeThreadId) return;
    if (status === 'streaming' || status === 'submitted') return;

    const messageSignature = JSON.stringify(messages);
    if (restoringMessagesSignatureRef.current !== null) {
      if (messageSignature === restoringMessagesSignatureRef.current) {
        restoringMessagesSignatureRef.current = null;
      }
      return;
    }
    saveThread(activeThreadId, messages, inputRef.current);
  }, [activeThreadId, areThreadsHydrated, messages, saveThread, status]);

  useEffect(() => {
    const persistCurrentThread = () => {
      const threadId = activeThreadIdRef.current;
      if (threadId && restoredThreadIdRef.current === threadId) {
        saveThread(threadId, latestMessagesRef.current, inputRef.current);
      }
    };
    window.addEventListener('pagehide', persistCurrentThread);
    return () => window.removeEventListener('pagehide', persistCurrentThread);
  }, [saveThread]);

  const saveCurrentThread = useCallback(() => {
    if (activeThreadId && restoredThreadIdRef.current === activeThreadId) {
      saveThread(activeThreadId, messages, input);
    }
  }, [activeThreadId, input, messages, saveThread]);

  const handleNewThread = useCallback(() => {
    if (isLoading) return;
    if (messages.length === 0 && !input.trim()) {
      setDirectCartMessage(null);
      return;
    }
    saveCurrentThread();
    const next = createThread();
    const thread = next.threads.find((candidate) => candidate.id === next.activeThreadId);
    if (thread) restoreThread(thread);
  }, [createThread, input, isLoading, messages.length, restoreThread, saveCurrentThread]);

  const handleThreadSelect = useCallback((threadId: string) => {
    if (isLoading || threadId === activeThreadId) return;
    saveCurrentThread();
    const next = selectThread(threadId);
    const thread = next.threads.find((candidate) => candidate.id === threadId);
    if (thread) restoreThread(thread);
  }, [activeThreadId, isLoading, restoreThread, saveCurrentThread, selectThread]);

  const handleThreadClose = useCallback((threadId: string) => {
    if (isLoading) return;
    const closingActiveThread = threadId === activeThreadId;
    const next = closeThread(threadId);
    if (!closingActiveThread) return;
    const thread = next.threads.find((candidate) => candidate.id === next.activeThreadId);
    if (thread) restoreThread(thread);
  }, [activeThreadId, closeThread, isLoading, restoreThread]);

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

    const buildHeaders = () => buildMarketplaceMcpHeaders(storeId);

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
      if (!viewCartResponse.ok || viewCartResult.error || !viewCartResult.result) {
        throw new Error('Cart could not be displayed');
      }

      const timestamp = Date.now();
      // Dropdown selection is navigation, not chat. Keep one replaceable direct
      // cart view outside the conversation instead of appending synthetic
      // user/assistant messages every time a store is selected.
      setDirectCartMessage({
        id: `direct-cart-${storeId}-${timestamp}`,
        role: 'assistant',
        parts: [{
          type: 'dynamic-tool',
          toolCallId: `direct_cart_${timestamp}`,
          toolName: 'viewCart',
          input: { storeId, cartId },
          state: 'output-available',
          output: viewCartResult.result,
        }],
      });
    } catch (error) {
      console.error('[handleCartSelect] Error:', error);
      setDirectCartMessage({
        id: `direct-cart-error-${storeId}-${Date.now()}`,
        role: 'assistant',
        parts: [{
          type: 'text',
          text: `${storeName} cart could not be opened right now. Please try again.`,
        }],
      });
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
  if (isInitializing || !areThreadsHydrated) return null;
  const showOnboarding = isAiChatReady && messages.length === 0 && !directCartMessage;
  const submitPrompt = () => {
    const nextPrompt = input.trim();
    if (!nextPrompt || isLoading) return;
    sendMessage({ text: nextPrompt });
    setInput("");
  };

  return (
    <div className="flex h-dvh gap-0 overflow-hidden bg-canvas p-0 text-ink sm:p-2.5 lg:pl-0">
      <MarketplaceSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        disabled={isLoading}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onNew={() => {
          setMobileSidebarOpen(false);
          handleNewThread();
        }}
        onSelect={(threadId) => {
          setMobileSidebarOpen(false);
          handleThreadSelect(threadId);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex min-h-0 flex-1 gap-2.5">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-0 bg-page shadow-none sm:rounded-[14px] sm:border sm:shadow-card">
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
              <button
                type="button"
                aria-label="Open sidebar"
                aria-controls="marketplace-sidebar"
                aria-expanded={mobileSidebarOpen}
                title="Open sidebar"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex size-6 shrink-0 items-center justify-center text-ink-3 transition-[color,transform] duration-150 hover:text-ink active:scale-[.96] lg:hidden"
              >
                <PanelLeftOpen className="size-3.5" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-controls="marketplace-sidebar"
                aria-expanded={!sidebarCollapsed}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed((value) => !value)}
                className="hidden size-6 shrink-0 items-center justify-center text-ink-3 transition-[color,transform] duration-150 hover:text-ink active:scale-[.96] lg:flex"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="size-3.5" strokeWidth={1.8} /> : <PanelLeftClose className="size-3.5" strokeWidth={1.8} />}
              </button>
              <div className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <CartsDropdown cartIds={cartIdsState} onCartSelect={handleCartSelect} disabled={isLoading} />
              <div className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
              <ChatThreadTabs
                threads={threads}
                activeThreadId={activeThreadId}
                disabled={isLoading}
                onSelect={handleThreadSelect}
                onClose={handleThreadClose}
                onNew={handleNewThread}
              />
            </div>

            {isAiChatReady ? (
              <>
                <div id="marketplace-chat-panel" role="tabpanel" className="relative min-h-0 flex-1">
                  {showOnboarding ? (
                    <div className="h-full overflow-y-auto">
                      <div className="mx-auto flex min-h-full max-w-[720px] flex-col justify-center px-4 py-10 sm:px-8">
                        <h1 className="tracking-[-0.02em] text-ink">
                          <span className="block text-[22px] font-normal text-ink-3 sm:text-[26px]">Hello Stranger,</span>
                          <span className="block text-[22px] font-normal sm:text-[26px]">Welcome to the only marketplace you&apos;ll ever need.</span>
                        </h1>

                        <form
                          onSubmit={(event) => { event.preventDefault(); submitPrompt(); }}
                          className="relative mt-7"
                        >
                          <div className="relative isolate flex flex-col gap-2.5 overflow-hidden rounded-[22px] border border-line bg-surface p-3.5 shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong focus-within:shadow-raised">
                            <textarea
                              value={input}
                              onChange={(event) => setInput(event.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveCurrentThread}
                              placeholder="What are you looking for..."
                              aria-label="Prompt"
                              disabled={isLoading}
                              rows={2}
                              className="min-h-[68px] w-full resize-none bg-transparent px-2 py-2 text-[16px] leading-6 text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 disabled:opacity-40"
                            />
                            <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1">
                              <div>
                                <ModeSplitButton
                                  disabled={isLoading}
                                  onSettingsClick={() => setShowSettingsDialog(true)}
                                  sharedKeys={sharedKeys}
                                  showModelLabelOnMobile
                                />
                              </div>
                              <Button
                                type="submit"
                                size="icon"
                                disabled={isLoading || !input.trim()}
                                aria-label="Send message"
                                className="size-7 rounded-control"
                              >
                                <ArrowUp className="size-4" strokeWidth={2.4} />
                              </Button>
                            </div>
                          </div>
                        </form>

                        <div className="mt-6 flex flex-col items-start">
                          <PromptSuggestions
                            onSuggestionClick={handleSuggestionClick}
                            footerAction={(
                              <Link href="/ethos" className="flex items-center gap-2 py-1 transition-colors duration-150 hover:text-ink">
                                The future of e-commerce is open and agentic
                                <ArrowRight className="size-[13px] translate-y-px" />
                              </Link>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ChatContainerRoot contextRef={chatScrollContextRef} className="relative h-full min-h-0">
                      <ChatContainerContent className="mx-auto flex w-full max-w-[760px] flex-col px-3 pb-3 pt-4 sm:px-6">
                        <div className="w-full space-y-2.5">
                          {messages.map((message, index) => (
                            <AIMessage
                              key={message.id || index}
                              message={message}
                              isLoading={isLoading}
                              status={status}
                              isLatestMessage={index === messages.length - 1 && !directCartMessage}
                              sendMessage={sendMessage as any}
                              stop={stop}
                              setMessages={setMessages}
                              messages={messages}
                              beginFollowingLatest={beginFollowingLatest}
                            />
                          ))}
                          {directCartMessage ? (
                            <AIMessage
                              key={directCartMessage.id}
                              message={directCartMessage}
                              isLoading={false}
                              status="ready"
                              isLatestMessage
                              sendMessage={sendMessage as any}
                              stop={stop}
                              setMessages={setMessages}
                              messages={messages}
                              beginFollowingLatest={beginFollowingLatest}
                              hideToolInvocation
                              onPromptAction={() => setDirectCartMessage(null)}
                            />
                          ) : null}
                          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" ? (
                            <LoadingState label="Thinking" variant="Drive" />
                          ) : null}
                        </div>
                        <ChatContainerScrollAnchor />
                        <div className="absolute bottom-2 right-2"><ScrollButton /></div>
                      </ChatContainerContent>
                    </ChatContainerRoot>
                  )}
                </div>

                {!showOnboarding ? (
                  <form
                    onSubmit={(event) => { event.preventDefault(); submitPrompt(); }}
                    className="mx-auto w-full max-w-[760px] shrink-0 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6"
                  >
                    <div className="flex cursor-text flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3 shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong focus-within:shadow-raised">
                      <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={saveCurrentThread}
                        placeholder="What are you looking for..."
                        disabled={isLoading}
                        rows={2}
                        className="min-h-10 w-full resize-none bg-transparent px-1 text-[16px] leading-[1.4] text-ink outline-none placeholder:text-ink-3 disabled:opacity-40"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <ModeSplitButton
                            disabled={isLoading}
                            onSettingsClick={() => setShowSettingsDialog(true)}
                            sharedKeys={sharedKeys}
                            showModelLabelOnMobile
                          />
                        </div>
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message" className="size-7 rounded-control">
                          <ArrowUp className="size-4" strokeWidth={2.4} />
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                <ChatUnactivatedState userName={user?.name} onActivate={handleActivationOpen} />
              </div>
            )}
          </section>
        </div>
      </div>

      <AIActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} onComplete={handleActivationComplete} sharedKeysStatus={sharedKeysStatus} />
      <AISettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} onSave={handleSettingsSave} sharedKeysStatus={sharedKeysStatus} />
    </div>
  );
}
