import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { attachStoreScopedSessionAuthorization } from '../lib/marketplace-self-mcp-auth.ts';
import {
  BOUNDED_JSON_REQUEST_MAX_CHUNKS,
  MCP_TRANSPORT_REQUEST_MAX_BYTES,
  parseBoundedStringMap,
  readJsonBodyBounded,
  RequestBodyTooLargeError,
} from '../lib/request-budgets.ts';
import { sourceIdFor } from '../lib/source-identity.ts';

const endpoint = 'http://marketplace.invalid/api/mcp-transport/http';
const requestHeaders = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};
const storeId = sourceIdFor({ baseUrl: 'https://shop.example', platform: 'openfront' });

function toolCallBody(requestedStoreId: unknown): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'getCart', arguments: { storeId: requestedStoreId } },
  });
}

function sdkRequest(body: string, signal?: AbortSignal): Request {
  // StreamableHTTPClientTransport calls fetch(url, init) with this JSON body shape.
  return new Request(endpoint, {
    method: 'POST',
    headers: requestHeaders,
    body,
    signal,
  });
}

function streamedSdkRequest(bytes: Uint8Array, chunkSize: number, signal?: AbortSignal): Request {
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + chunkSize, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  });
  return new Request(endpoint, {
    method: 'POST',
    headers: requestHeaders,
    body,
    signal,
    duplex: 'half',
  } as RequestInit);
}

async function outgoingHeaders(request: Request, sessionTokens: Record<string, string>): Promise<Headers> {
  const headers = new Headers(request.headers);
  await attachStoreScopedSessionAuthorization(request, headers, sessionTokens);
  return headers;
}

test('SDK request shape and bounded clone preserve valid source-scoped session credentials', async () => {
  assert.equal(MCP_TRANSPORT_REQUEST_MAX_BYTES, 128 * 1024);
  const sdk = readFileSync(resolve('node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js'), 'utf8');
  assert.match(sdk, /method: 'POST'[\s\S]*?body: JSON\.stringify\(message\)[\s\S]*?signal:[\s\S]*?_abortController/);
  assert.match(sdk, /this\._fetch\)[\s\S]*?this\._url, init/);

  const sessionTokens = parseBoundedStringMap({ [storeId]: 'source-session-token' });
  assert.throws(() => parseBoundedStringMap(JSON.parse('{"__proto__":"unsafe"}')), SyntaxError);
  assert.throws(() => parseBoundedStringMap({ constructor: 'unsafe' }), SyntaxError);
  const originalMaps = JSON.stringify(sessionTokens);
  const body = toolCallBody(storeId);
  const request = sdkRequest(body);
  const headers = await outgoingHeaders(request, sessionTokens);

  assert.equal(headers.get('authorization'), 'Bearer source-session-token');
  assert.equal(await request.text(), body, 'reading the clone leaves the SDK request body readable');
  assert.equal(JSON.stringify(sessionTokens), originalMaps, 'credential maps are not mutated');
  assert.match(
    readFileSync('app/api/mcp-transport/[transport]/route.ts', 'utf8'),
    /MCP_TRANSPORT_REQUEST_MAX_BYTES/,
    'the local MCP route applies the same byte limit',
  );
});

test('wrong-source, malformed, and non-string store IDs never attach a bearer', async () => {
  const sessionTokens = { [storeId]: 'source-session-token' };
  for (const body of [
    toolCallBody('source-v2-openfront-https_3A_2F_2Fother.example'),
    toolCallBody({ toString: 'not-a-store-id' }),
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  ]) {
    const request = sdkRequest(body);
    const headers = await outgoingHeaders(request, sessionTokens);
    assert.equal(headers.has('authorization'), false);
    assert.equal(await request.text(), body, 'invalid preflight does not consume the original body');
  }
});

test('malformed self-MCP clone gets no bearer and remains for bounded route rejection', async () => {
  const body = '{malformed-json';
  const request = sdkRequest(body);
  const headers = await outgoingHeaders(request, { [storeId]: 'source-session-token' });

  assert.equal(headers.has('authorization'), false);
  await assert.rejects(
    readJsonBodyBounded(request.clone(), MCP_TRANSPORT_REQUEST_MAX_BYTES),
    SyntaxError,
  );
  assert.equal(await request.text(), body);
});

test('oversized streamed self-MCP request fails preflight closed and remains for route rejection', async () => {
  const sessionTokens = { [storeId]: 'source-session-token' };
  const body = `${toolCallBody(storeId)}${' '.repeat(MCP_TRANSPORT_REQUEST_MAX_BYTES + 1)}`;
  const request = sdkRequest(body);
  const headers = await outgoingHeaders(request, sessionTokens);

  assert.equal(headers.has('authorization'), false, 'oversized request never receives the bearer');
  await assert.rejects(
    readJsonBodyBounded(request.clone(), MCP_TRANSPORT_REQUEST_MAX_BYTES),
    RequestBodyTooLargeError,
  );
  assert.equal(await request.text(), body, 'clone cancellation preserves the original SDK body');
});

test('fragmented request hits chunk budget without token egress or body loss', async () => {
  assert.equal(BOUNDED_JSON_REQUEST_MAX_CHUNKS, 8_192);
  const sessionTokens = { [storeId]: 'source-session-token' };
  const body = `${toolCallBody(storeId)}${' '.repeat(8_193)}`;
  const request = streamedSdkRequest(new TextEncoder().encode(body), 1);
  const headers = await outgoingHeaders(request, sessionTokens);

  assert.equal(headers.has('authorization'), false, 'chunk-exhausted request never receives the bearer');
  await assert.rejects(
    readJsonBodyBounded(request.clone(), MCP_TRANSPORT_REQUEST_MAX_BYTES),
    RequestBodyTooLargeError,
  );
  assert.equal(await request.text(), body, 'the original branch stays readable after clone cancellation');
});

test('aborted SDK request fails closed without synthesizing a bearer', async () => {
  const abortController = new AbortController();
  const request = sdkRequest(toolCallBody(storeId), abortController.signal);
  const headers = new Headers(request.headers);
  const preflight = attachStoreScopedSessionAuthorization(request, headers, {
    [storeId]: 'source-session-token',
  });
  abortController.abort();
  await preflight;

  assert.equal(headers.has('authorization'), false);
  assert.equal(request.signal.aborted, true, 'the abort belongs to the SDK request signal');
  assert.equal(request.bodyUsed, false, 'preflight did not consume the original request');
});

test('completion wrapper scopes the bounded clone hint and still forwards original request/maps', () => {
  const route = readFileSync('app/api/completion/route.ts', 'utf8');
  assert.match(route, /await attachStoreScopedSessionAuthorization\(request, headers, currentSessionTokens\)/);
  assert.doesNotMatch(route, /JSON\.parse\(await request\.clone\(\)\.text\(\)\)/);
  assert.match(route, /X-Cart-Ids/);
  assert.match(route, /X-Cart-Proofs/);
  assert.match(route, /fetch\(request, \{ headers, redirect: 'error' \}\)/);
});
