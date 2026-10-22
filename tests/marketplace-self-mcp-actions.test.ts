import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BOUNDED_JSON_RESPONSE_MAX_CHUNKS,
  readJsonResponseBounded,
  ResponseBodyTooLargeError,
} from '../lib/request-budgets.ts';
import {
  applyMarketplaceSelfMcpActions,
  MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES,
  type MarketplaceSelfMcpActionState,
} from '../lib/marketplace-self-mcp-actions.ts';

const encoder = new TextEncoder();

function emptyState(): MarketplaceSelfMcpActionState {
  return { cartIds: {}, cartProofs: {}, sessionTokens: {} };
}

function selfMcpResponse(clientAction: Record<string, unknown>, textData: Record<string, unknown>) {
  const body = {
    jsonrpc: '2.0',
    id: 'tool-call-1',
    result: {
      content: [{ type: 'text', text: JSON.stringify(textData) }],
      _meta: { marketplace: { clientAction } },
    },
  };
  const text = JSON.stringify(body);
  return { response: new Response(text, { headers: { 'content-type': 'application/json' } }), text };
}

test('local MCP cart-action fixture matches route normalization and retains the complete proof', async () => {
  assert.equal(MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES, 8 * 1024 * 1024);
  const route = readFileSync('app/api/mcp-transport/[transport]/route.ts', 'utf8');
  const cartTools = readFileSync('app/api/mcp-transport/tools/cart-tools.ts', 'utf8');
  assert.match(route, /result: \(result && typeof result === 'object' && 'result' in result\) \? \(result as any\)\.result : result/);
  assert.match(cartTools, /_meta: marketplaceClientMeta\(clientAction\)/);

  const cartProof = `source-proof:${'p'.repeat(3_000)}`;
  const { response, text } = selfMcpResponse(
    { type: 'saveCartId', storeId: 'source-1', cartId: 'cart-1', cartProof },
    { storeId: 'source-1', cart: { id: 'cart-1' } },
  );
  const state = emptyState();
  await applyMarketplaceSelfMcpActions(response, state);

  assert.deepEqual(state, {
    cartIds: { 'source-1': 'cart-1' },
    cartProofs: { 'source-1': cartProof },
    sessionTokens: {},
  });
  assert.equal(await response.text(), text, 'the SDK-facing original response remains readable and unchanged');
});

test('normal session action preserves its token and active cart identity', async () => {
  const sessionToken = `session:${'s'.repeat(2_000)}`;
  const { response } = selfMcpResponse(
    { type: 'saveSessionToken', storeId: 'source-2', sessionToken, activeCartId: 'cart-2' },
    { storeId: 'source-2', activeCartId: 'cart-2' },
  );
  const state = emptyState();
  await applyMarketplaceSelfMcpActions(response, state);
  assert.deepEqual(state, {
    cartIds: { 'source-2': 'cart-2' },
    cartProofs: {},
    sessionTokens: { 'source-2': sessionToken },
  });
});

test('streamed byte overflow skips action extraction and leaves the original response intact', async () => {
  const state = emptyState();
  const clientAction = { type: 'saveCartId', storeId: 'source-3', cartId: 'cart-3', cartProof: 'proof-3' };
  const actionPrefix = JSON.stringify({
    jsonrpc: '2.0',
    id: 'tool-call-3',
    result: {
      content: [{ type: 'text', text: JSON.stringify({ storeId: 'source-3' }) }],
      _meta: { marketplace: { clientAction } },
    },
  });
  const streamedText = `${actionPrefix.slice(0, -1)}${' '.repeat(MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES + 1)}}`;
  const bytes = encoder.encode(streamedText);
  let offset = 0;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + 64 * 1024, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  }));

  await applyMarketplaceSelfMcpActions(response, state);
  assert.deepEqual(state, emptyState(), 'overflow never partially applies a proof or cart ID');
  assert.equal((await response.arrayBuffer()).byteLength, bytes.byteLength, 'only the clone reader is cancelled');
});

test('streamed overflow settles before the SDK starts reading the original tee branch', async () => {
  const size = MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES + 3 * 64 * 1024;
  let remaining = size;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (remaining <= 0) { controller.close(); return; }
      const length = Math.min(remaining, 64 * 1024);
      remaining -= length;
      controller.enqueue(new Uint8Array(length));
    },
  }));
  const state = emptyState();
  const task = applyMarketplaceSelfMcpActions(response, state);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const settled = await Promise.race([
      task.then(() => true),
      new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 500); }),
    ]);
    assert.equal(settled, true, 'clone cancellation must not wait for the SDK-facing branch');
    assert.deepEqual(state, emptyState());
    assert.equal((await response.arrayBuffer()).byteLength, size, 'original bytes remain intact');
  } finally {
    if (timer) clearTimeout(timer);
    if (response.body && !response.bodyUsed) await response.body.cancel();
    await task;
  }
});

test('declared oversize clone cancellation also settles without SDK consumption', async () => {
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array([0x20])); },
  }), { headers: { 'content-length': String(MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES + 1) } });
  const task = applyMarketplaceSelfMcpActions(response, emptyState());
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const settled = await Promise.race([
      task.then(() => true),
      new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 500); }),
    ]);
    assert.equal(settled, true);
  } finally {
    if (timer) clearTimeout(timer);
    await response.body?.cancel();
    await task;
  }
});

test('fragmented response hits the finite chunk cap and cancels its reader', async () => {
  assert.equal(BOUNDED_JSON_RESPONSE_MAX_CHUNKS, 8_192);
  let chunksRemaining = BOUNDED_JSON_RESPONSE_MAX_CHUNKS + 1;
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunksRemaining-- > 0) controller.enqueue(new Uint8Array([0x20]));
      else controller.close();
    },
    cancel() { cancelled = true; },
  }));
  await assert.rejects(
    readJsonResponseBounded(response, MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES),
    ResponseBodyTooLargeError,
  );
  assert.equal(cancelled, true);
});

test('cancelled self-MCP stream skips action extraction without partial state changes', async () => {
  const state = emptyState();
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new DOMException('synthetic stream cancellation', 'AbortError'));
    },
  }));
  await assert.doesNotReject(applyMarketplaceSelfMcpActions(response, state));
  assert.deepEqual(state, emptyState());
});
