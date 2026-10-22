import type { UIMessage } from 'ai';

export const CHAT_THREADS_STORAGE_KEY = 'openfront_marketplace_chat_threads';
export const CHAT_THREADS_UPDATED_EVENT = 'marketplaceChatThreadsUpdated';
export const NEW_CHAT_TITLE = 'New chat';

export const CHAT_THREADS_STORAGE_VERSION = 2 as const;
const STORAGE_VERSION = CHAT_THREADS_STORAGE_VERSION;
const MAX_THREADS = 50;
const MAX_MESSAGES_PER_THREAD = 100;
const MAX_STORAGE_BYTES = 3_750_000;
const SENSITIVE_KEYS = new Set([
  '_meta',
  'authorization',
  'apikey',
  'cartproof',
  'clientsecret',
  'cookie',
  'ctoken',
  'paypalorderid',
  'proof',
  'sessiontoken',
  'set-cookie',
]);

export interface MarketplaceChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  draft?: string;
}

export interface MarketplaceChatThreadState {
  version: typeof STORAGE_VERSION;
  activeThreadId: string;
  threads: MarketplaceChatThread[];
}

function emptyState(): MarketplaceChatThreadState {
  return { version: STORAGE_VERSION, activeThreadId: '', threads: [] };
}

function generateThreadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMarketplaceChatThread(now = Date.now()): MarketplaceChatThread {
  return {
    id: generateThreadId(),
    title: NEW_CHAT_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredMessage(value: unknown): value is UIMessage {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant' || value.role === 'system') &&
    Array.isArray(value.parts);
}

function normalizeThread(value: unknown): MarketplaceChatThread | null {
  if (!isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.title !== 'string' ||
      typeof value.createdAt !== 'number' ||
      typeof value.updatedAt !== 'number' ||
      !Array.isArray(value.messages)) {
    return null;
  }

  const title = value.title.trim().slice(0, 80) || NEW_CHAT_TITLE;
  const messages = sanitizeMarketplaceChatMessages(value.messages.filter(isStoredMessage).slice(-MAX_MESSAGES_PER_THREAD));
  const draft = typeof value.draft === 'string' ? value.draft.slice(0, 20_000) : undefined;
  return {
    id: value.id,
    title,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    messages,
    ...(draft ? { draft } : {}),
  };
}

function normalizeState(value: unknown): MarketplaceChatThreadState {
  if (!isRecord(value) || (value.version !== 1 && value.version !== STORAGE_VERSION) || !Array.isArray(value.threads)) {
    return emptyState();
  }

  const seen = new Set<string>();
  const threads = value.threads.flatMap((candidate) => {
    const thread = normalizeThread(candidate);
    if (!thread || seen.has(thread.id)) return [];
    seen.add(thread.id);
    return [thread];
  }).slice(-MAX_THREADS);
  const requestedActiveId = typeof value.activeThreadId === 'string' ? value.activeThreadId : '';
  const activeThreadId = threads.some((thread) => thread.id === requestedActiveId)
    ? requestedActiveId
    : threads.at(-1)?.id || '';

  return { version: STORAGE_VERSION, activeThreadId, threads };
}

function sanitizeUnknown(value: unknown, seen: WeakSet<object>): { value: unknown; redacted: boolean } {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { value, redacted: false };
    }
    try {
      const parsed = JSON.parse(value);
      const sanitized = sanitizeUnknown(parsed, seen);
      return sanitized.redacted
        ? { value: JSON.stringify(sanitized.value, null, 2), redacted: true }
        : { value, redacted: false };
    } catch {
      return { value, redacted: false };
    }
  }

  if (Array.isArray(value)) {
    let redacted = false;
    const sanitized = value.map((item) => {
      const result = sanitizeUnknown(item, seen);
      redacted ||= result.redacted;
      return result.value;
    });
    return { value: sanitized, redacted };
  }

  if (!isRecord(value)) return { value, redacted: false };
  if (seen.has(value)) return { value: undefined, redacted: true };
  seen.add(value);

  let redacted = false;
  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted = true;
      continue;
    }
    if (
      key === '__clientAction' &&
      isRecord(nestedValue) &&
      nestedValue.type === 'saveSessionToken'
    ) {
      redacted = true;
      continue;
    }
    const result = sanitizeUnknown(nestedValue, seen);
    redacted ||= result.redacted;
    if (result.value !== undefined) sanitized[key] = result.value;
  }
  seen.delete(value);
  return { value: sanitized, redacted };
}

/** Persist inert text, never merchant HTML, credentials, or executable tool results. */
export function sanitizeMarketplaceChatMessages(messages: UIMessage[]): UIMessage[] {
  const projected = messages.slice(-MAX_MESSAGES_PER_THREAD).flatMap(message => {
    if (!isStoredMessage(message)) return [];
    const parts: UIMessage['parts'] = message.parts.slice(0, 40).flatMap(part => {
      if (part.type === 'text' && typeof part.text === 'string') {
        return [{ type: 'text' as const, text: part.text.slice(0, 12_000) }];
      }
      return [];
    });
    if (!parts.length && message.role === 'assistant') {
      parts.push({ type: 'text', text: 'Historical tool result omitted for privacy. Refresh discovery for current details; no action was replayed.' });
    }
    return parts.length ? [{ id: message.id.slice(0, 160), role: message.role, parts }] : [];
  });
  return sanitizeUnknown(projected, new WeakSet<object>()).value as UIMessage[];
}

function firstUserText(messages: UIMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user' || !Array.isArray(message.parts)) continue;
    const text = message.parts
      .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) return text;
  }
  return '';
}

export function deriveMarketplaceChatTitle(messages: UIMessage[]): string {
  const text = firstUserText(messages);
  if (!text) return NEW_CHAT_TITLE;
  if (text.length <= 48) return text;
  const shortened = text.slice(0, 48).replace(/\s+\S*$/, '').trim();
  return `${shortened || text.slice(0, 48).trim()}…`;
}

function serializedBytes(value: MarketplaceChatThreadState): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function compactState(value: MarketplaceChatThreadState): MarketplaceChatThreadState {
  let state = normalizeState(value);
  if (state.threads.length > MAX_THREADS) {
    const oldestFirst = [...state.threads].sort((left, right) => left.updatedAt - right.updatedAt);
    const removeIds = new Set(oldestFirst.slice(0, state.threads.length - MAX_THREADS).map((thread) => thread.id));
    state = { ...state, threads: state.threads.filter((thread) => !removeIds.has(thread.id)) };
  }

  while (serializedBytes(state) > MAX_STORAGE_BYTES && state.threads.length > 1) {
    const removable = state.threads
      .filter((thread) => thread.id !== state.activeThreadId)
      .sort((left, right) => left.updatedAt - right.updatedAt)[0];
    if (!removable) break;
    state = { ...state, threads: state.threads.filter((thread) => thread.id !== removable.id) };
  }

  while (serializedBytes(state) > MAX_STORAGE_BYTES) {
    const activeIndex = state.threads.findIndex((thread) => thread.id === state.activeThreadId);
    if (activeIndex < 0 || state.threads[activeIndex].messages.length <= 1) break;
    const threads = [...state.threads];
    threads[activeIndex] = {
      ...threads[activeIndex],
      messages: threads[activeIndex].messages.slice(1),
    };
    state = { ...state, threads };
  }

  return state;
}

function publishState(state: MarketplaceChatThreadState): MarketplaceChatThreadState {
  if (typeof window === 'undefined') return state;
  const compacted = compactState(state);
  try {
    localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(compacted));
    window.dispatchEvent(new CustomEvent(CHAT_THREADS_UPDATED_EVENT, { detail: compacted }));
  } catch (error) {
    console.error('Error saving chat threads to localStorage:', error);
  }
  return compacted;
}

export function getMarketplaceChatThreadState(): MarketplaceChatThreadState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const stored = localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
    return stored ? normalizeState(JSON.parse(stored)) : emptyState();
  } catch (error) {
    console.error('Error reading chat threads from localStorage:', error);
    return emptyState();
  }
}

export function initializeMarketplaceChatThreads(): MarketplaceChatThreadState {
  const state = getMarketplaceChatThreadState();
  if (state.threads.length) return state;
  const thread = createMarketplaceChatThread();
  return publishState({ version: STORAGE_VERSION, activeThreadId: thread.id, threads: [thread] });
}

export function createMarketplaceChatThreadInStorage(): MarketplaceChatThreadState {
  const current = initializeMarketplaceChatThreads();
  const thread = createMarketplaceChatThread();
  return publishState({
    ...current,
    activeThreadId: thread.id,
    threads: [...current.threads, thread],
  });
}

export function selectMarketplaceChatThread(threadId: string): MarketplaceChatThreadState {
  const current = initializeMarketplaceChatThreads();
  if (!current.threads.some((thread) => thread.id === threadId)) return current;
  return publishState({ ...current, activeThreadId: threadId });
}

export function saveMarketplaceChatThread(
  threadId: string,
  messages: UIMessage[],
  draft = '',
): MarketplaceChatThreadState {
  const current = initializeMarketplaceChatThreads();
  const sanitizedMessages = sanitizeMarketplaceChatMessages(messages);
  const title = deriveMarketplaceChatTitle(sanitizedMessages);
  const currentThread = current.threads.find((thread) => thread.id === threadId);
  if (!currentThread) return current;

  const normalizedDraft = draft.slice(0, 20_000);
  if (
    currentThread.title === title &&
    (currentThread.draft || '') === normalizedDraft &&
    JSON.stringify(currentThread.messages) === JSON.stringify(sanitizedMessages)
  ) {
    return current;
  }

  const now = Date.now();
  return publishState({
    ...current,
    threads: current.threads.map((thread) => thread.id === threadId
      ? {
          ...thread,
          title,
          updatedAt: now,
          messages: sanitizedMessages,
          ...(normalizedDraft ? { draft: normalizedDraft } : { draft: undefined }),
        }
      : thread),
  });
}

export function closeMarketplaceChatThread(threadId: string): MarketplaceChatThreadState {
  const current = initializeMarketplaceChatThreads();
  const closingIndex = current.threads.findIndex((thread) => thread.id === threadId);
  if (closingIndex < 0) return current;

  const remaining = current.threads.filter((thread) => thread.id !== threadId);
  if (!remaining.length) {
    const replacement = createMarketplaceChatThread();
    return publishState({ version: STORAGE_VERSION, activeThreadId: replacement.id, threads: [replacement] });
  }

  const fallback = remaining[Math.min(closingIndex, remaining.length - 1)];
  return publishState({
    ...current,
    activeThreadId: current.activeThreadId === threadId ? fallback.id : current.activeThreadId,
    threads: remaining,
  });
}
