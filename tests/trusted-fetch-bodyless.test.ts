import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { createTrustedFetch } from '../lib/remote-endpoint.ts';

// Transport smoke only: a disposable loopback fixture, not Marketplace/source E2E.
test('trusted fetch handles bodyless 204/205 and HEAD without crashing its HTTP callback', async () => {
  const server = createServer((request, response) => {
    if (request.method === 'HEAD') {
      response.writeHead(200, { 'content-length': '9', 'x-fixture': 'head' }).end();
    } else {
      response.writeHead(request.url === '/reset' ? 205 : 204, { 'x-fixture': 'empty' }).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const fetch = createTrustedFetch({ allowedOrigins: [origin], allowDevelopmentPrivateEndpoints: true });
  try {
    for (const [path, method, status] of [['/empty', 'GET', 204], ['/reset', 'GET', 205], ['/head', 'HEAD', 200]] as const) {
      const response = await fetch(`${origin}${path}`, { method });
      assert.equal(response.status, status);
      assert.equal(response.body, null);
      assert.equal(await response.text(), '');
      assert.ok(response.headers.get('x-fixture'));
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
