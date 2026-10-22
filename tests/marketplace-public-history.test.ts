import assert from 'node:assert/strict';
import test from 'node:test';
import type { UIMessage } from 'ai';
import {
  CHAT_THREADS_STORAGE_VERSION,
  getMarketplaceChatThreadState,
  sanitizeMarketplaceChatMessages,
  type MarketplaceChatThreadState,
} from '../lib/chat-thread-storage.ts';

// Contextual typing keeps the fixture's version/role/part discriminants exact.
const fixture = {
  version: CHAT_THREADS_STORAGE_VERSION,
  activeThreadId: 'thread-1',
  threads: [{
    id: 'thread-1', title: 'Shopping', createdAt: 1, updatedAt: 1,
    messages: [{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Find a shirt' }] }],
  }],
} satisfies MarketplaceChatThreadState;

const toolMessage = {
  id: 'tool-1', role: 'assistant', parts: [{
    type: 'dynamic-tool', toolName: 'getProduct', toolCallId: 'call-1',
    state: 'output-available', input: {},
    output: { html: '<script>PRIVATE-FIXTURE</script>', sessionToken: 'PRIVATE-FIXTURE',
      __clientAction: { type: 'saveCartId', cartId: 'old-cart' } },
  }],
} satisfies UIMessage;

test('history fixture uses the same literal storage version as the hook and schema', () => {
  assert.equal(fixture.version, 2);
});

test('history retains text but never restores source HTML or executable lifecycle results', () => {
  const saved = sanitizeMarketplaceChatMessages([...fixture.threads[0].messages, toolMessage]);
  assert.equal(saved[0].parts[0].type, 'text');
  assert.match(JSON.stringify(saved), /Find a shirt/);
  assert.match(JSON.stringify(saved), /Historical tool result omitted/);
  assert.doesNotMatch(JSON.stringify(saved), /PRIVATE-FIXTURE|saveCartId|old-cart|dynamic-tool|<script>/);
});

test('v1 and v2 history load safely without rewriting existing browser storage', () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let version = 1;
  let writes = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => JSON.stringify({ ...fixture, version, threads: [{ ...fixture.threads[0], messages: [toolMessage] }] }),
    setItem: () => { writes++; },
  } });
  try {
    for (version of [1, 2]) {
      const restored = getMarketplaceChatThreadState();
      assert.equal(restored.version, CHAT_THREADS_STORAGE_VERSION);
      assert.equal(restored.activeThreadId, 'thread-1');
      assert.match(JSON.stringify(restored), /Historical tool result omitted/);
      assert.doesNotMatch(JSON.stringify(restored), /PRIVATE-FIXTURE|saveCartId/);
    }
    assert.equal(writes, 0, 'loading must not migrate or erase saved bytes');
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
