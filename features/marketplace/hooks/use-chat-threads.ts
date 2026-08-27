"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UIMessage } from 'ai';
import {
  CHAT_THREADS_STORAGE_KEY,
  CHAT_THREADS_UPDATED_EVENT,
  closeMarketplaceChatThread,
  createMarketplaceChatThreadInStorage,
  getMarketplaceChatThreadState,
  initializeMarketplaceChatThreads,
  saveMarketplaceChatThread,
  selectMarketplaceChatThread,
  type MarketplaceChatThreadState,
} from '@/lib/chat-thread-storage';

const EMPTY_STATE: MarketplaceChatThreadState = {
  version: 1,
  activeThreadId: '',
  threads: [],
};

export function useChatThreads() {
  const [state, setState] = useState<MarketplaceChatThreadState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(getMarketplaceChatThreadState());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CHAT_THREADS_STORAGE_KEY) sync();
    };

    setState(initializeMarketplaceChatThreads());
    setIsHydrated(true);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHAT_THREADS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CHAT_THREADS_UPDATED_EVENT, sync);
    };
  }, []);

  const activeThread = useMemo(
    () => state.threads.find((thread) => thread.id === state.activeThreadId) || null,
    [state],
  );

  const createThread = useCallback(() => {
    const next = createMarketplaceChatThreadInStorage();
    setState(next);
    return next;
  }, []);

  const selectThread = useCallback((threadId: string) => {
    const next = selectMarketplaceChatThread(threadId);
    setState(next);
    return next;
  }, []);

  const saveThread = useCallback((threadId: string, messages: UIMessage[], draft = '') => {
    const next = saveMarketplaceChatThread(threadId, messages, draft);
    setState(next);
    return next;
  }, []);

  const closeThread = useCallback((threadId: string) => {
    const next = closeMarketplaceChatThread(threadId);
    setState(next);
    return next;
  }, []);

  return {
    ...state,
    activeThread,
    isHydrated,
    createThread,
    selectThread,
    saveThread,
    closeThread,
  };
}
