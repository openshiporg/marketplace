import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readJsonResponseBounded,
  ResponseBodyTooLargeError,
  SOURCE_GRAPHQL_RESPONSE_MAX_BYTES,
  SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES,
} from '../lib/request-budgets.ts';

const encoder = new TextEncoder();

function responseFromChunks(chunks: Uint8Array[], headers?: HeadersInit): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  }), { headers });
}

test('source response budgets distinguish GraphQL payloads from schema introspection', () => {
  assert.equal(SOURCE_GRAPHQL_RESPONSE_MAX_BYTES, 2 * 1024 * 1024);
  assert.equal(SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES, 8 * 1024 * 1024);
  assert.ok(SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES > SOURCE_GRAPHQL_RESPONSE_MAX_BYTES);
});

test('bounded reader parses normal streamed JSON within Content-Length and byte budgets', async () => {
  const bytes = encoder.encode('{"data":{"products":[]}}');
  const result = await readJsonResponseBounded<{ data: { products: unknown[] } }>(
    responseFromChunks([bytes], { 'content-length': String(bytes.byteLength) }),
    bytes.byteLength,
  );
  assert.deepEqual(result, { data: { products: [] } });
});

test('declared oversized response is rejected and its stream is cancelled before reading', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    cancel() { cancelled = true; },
  }), { headers: { 'content-length': '1024' } });

  await assert.rejects(
    readJsonResponseBounded(response, 32),
    (error: unknown) => error instanceof ResponseBodyTooLargeError && !error.message.includes('secret'),
  );
  assert.equal(cancelled, true);
});

test('streamed response without Content-Length is stopped at the byte limit', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('{"data":"' + 'x'.repeat(80)));
    },
    cancel() { cancelled = true; },
  }));

  await assert.rejects(readJsonResponseBounded(response, 32), ResponseBodyTooLargeError);
  assert.equal(cancelled, true);
});

test('fragmented zero-byte streams also hit a bounded chunk-count budget', async () => {
  let chunksRemaining = 8_193;
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunksRemaining-- > 0) controller.enqueue(new Uint8Array());
      else controller.close();
    },
    cancel() { cancelled = true; },
  }));

  await assert.rejects(readJsonResponseBounded(response, 128), ResponseBodyTooLargeError);
  assert.equal(cancelled, true);
});

test('malformed JSON and invalid Content-Length fail closed without echoing the body', async () => {
  const malformed = responseFromChunks([encoder.encode('{"secret":"never-return-this"')]);
  await assert.rejects(
    readJsonResponseBounded(malformed, 128),
    (error: unknown) => error instanceof SyntaxError
      && error.message === 'Invalid remote JSON response'
      && !error.message.includes('never-return-this'),
  );

  let cancelled = false;
  const invalidLength = new Response(new ReadableStream<Uint8Array>({
    cancel() { cancelled = true; },
  }), { headers: { 'content-length': 'not-a-length' } });
  await assert.rejects(readJsonResponseBounded(invalidLength, 128), /Invalid remote Content-Length/);
  assert.equal(cancelled, true);

  const inconsistentLength = responseFromChunks([encoder.encode('{"ok":true}')], { 'content-length': '1' });
  await assert.rejects(readJsonResponseBounded(inconsistentLength, 128), /did not match Content-Length/);
});

test('reader propagates an aborted remote stream and attempts cancellation', async () => {
  const abort = new AbortController();
  let cancelled = false;
  let sourceController: ReadableStreamDefaultController<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      sourceController = controller;
      controller.enqueue(encoder.encode('{"partial":'));
    },
    pull(controller) {
      return new Promise<void>(resolve => {
        abort.signal.addEventListener('abort', () => {
          controller.error(abort.signal.reason);
          resolve();
        }, { once: true });
      });
    },
    cancel() { cancelled = true; },
  });
  const pending = readJsonResponseBounded(new Response(body), 128);
  await new Promise<void>(resolve => setImmediate(resolve));
  abort.abort(new DOMException('aborted', 'AbortError'));

  await assert.rejects(pending, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
  assert.ok(sourceController);
  // An errored stream cannot run its cancel algorithm, but the reader must still
  // be released and the fetch's AbortSignal terminates the underlying socket.
  assert.equal(cancelled, false);
});
