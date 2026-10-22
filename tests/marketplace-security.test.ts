import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { escapeHtml, safeHttpUrl, scriptJson } from '../lib/safe-content.ts';
import { parseBoundedStringMap, validateJsonSchema } from '../lib/request-budgets.ts';
import { createTrustedFetch, isPublicIpAddress } from '../lib/remote-endpoint.ts';
import { isPermittedMcpUiAction, isPermittedMcpUiPrompt } from '../lib/mcp-action-policy.ts';
import { projectMarketplaceToolOutput, projectMarketplaceMessagesForModel } from '../lib/marketplace-ai-boundary.ts';

test('request maps and schemas reject malformed or unbounded tool input', () => {
  assert.deepEqual(parseBoundedStringMap({ 'source-retail-1': 'cart-id' }), { 'source-retail-1': 'cart-id' });
  assert.throws(() => parseBoundedStringMap({ 'source-retail-1': 'x\nBearer secret' }), SyntaxError);
  assert.throws(() => parseBoundedStringMap(Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`s${i}`, 'x']))), SyntaxError);

  const schema = {
    type: 'object',
    properties: { quantity: { type: 'integer', minimum: 1, maximum: 99 }, id: { type: 'string', maxLength: 20 } },
    required: ['quantity', 'id'],
    additionalProperties: false,
  };
  assert.equal(validateJsonSchema({ quantity: 2, id: 'variant-1' }, schema).valid, true);
  assert.equal(validateJsonSchema({ quantity: 0, id: 'variant-1' }, schema).valid, false);
  assert.equal(validateJsonSchema({ quantity: 2, id: 'variant-1', user: { connect: { id: 'admin' } } }, schema).valid, false);
});

test('generated content helpers escape HTML/script data and reject active image URLs', () => {
  const escaped = escapeHtml('\"><img src=x onerror=alert(1)>&');
  assert.equal(escaped.includes('<img'), false);
  assert.equal(escaped.includes('&lt;img'), true);
  assert.equal(scriptJson('</script><script>alert(1)</script>').includes('<script'), false);
  assert.equal(safeHttpUrl('javascript:alert(1)', undefined, '/placeholder.svg'), '/placeholder.svg');
  assert.equal(safeHttpUrl('data:image/svg+xml,<svg onload=alert(1)>', undefined, '/placeholder.svg'), '/placeholder.svg');
  assert.equal(safeHttpUrl('//attacker.example/image.svg', undefined, '/placeholder.svg'), '/placeholder.svg');
  assert.equal(safeHttpUrl('/images/item.png', 'https://store.example'), 'https://store.example/images/item.png');
  assert.equal(safeHttpUrl('https://store.example/item.png'), 'https://store.example/item.png');
});

test('remote endpoint classification rejects private/reserved IPv4 and IPv6 targets', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.1.1', '172.20.0.1', '192.168.1.1', '198.51.100.8', '203.0.113.4', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1', '3fff::1']) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
});

test('trusted fetch pins the validated development DNS answer and rejects redirects', async () => {
  if (process.env.NODE_ENV === 'production') return;
  let redirectedRequestCount = 0;
  const server = createServer((request, response) => {
    if (request.url === '/redirect') {
      response.writeHead(302, { location: '/target' }).end();
      return;
    }
    if (request.url === '/target') redirectedRequestCount += 1;
    response.writeHead(200, { 'content-type': 'text/plain' }).end('source-contract-ok');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const port = (server.address() as AddressInfo).port;
    const origin = `http://source.local:${port}`;
    const policy = {
      allowedOrigins: [origin],
      developmentPrivateOrigins: [origin],
      resolve: (async () => [{ address: '127.0.0.1', family: 4 }]) as any,
    };
    const trustedFetch = createTrustedFetch(policy);
    const response = await trustedFetch(`${origin}/read`);
    assert.equal(await response.text(), 'source-contract-ok');
    await assert.rejects(() => trustedFetch(`${origin}/redirect`), /Redirected remote endpoints/);
    assert.equal(redirectedRequestCount, 0);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('login/conflict actions match emitted URIs and cannot cross source/cart audiences', () => {
  assert.equal(isPermittedMcpUiAction('ui://marketplace/login?store=s1&cart=c1', 'authenticateUser', { storeId: 's1', cartId: 'c1' }), true);
  assert.equal(isPermittedMcpUiAction('ui://marketplace/login?store=s1&cart=c1', 'authenticateUser', { storeId: 's2', cartId: 'c1' }), false);
  assert.equal(isPermittedMcpUiAction('ui://marketplace/email-conflict?store=s1&cart=c1', 'setShippingAddress', { storeId: 's1', cartId: 'c2' }), false);
  assert.equal(isPermittedMcpUiAction('ui://attacker/cart/c1?store=s1', 'viewCart', { storeId: 's1', cartId: 'c1' }), false);
  assert.equal(isPermittedMcpUiPrompt('ui://marketplace/email-conflict?store=s1&cart=c1', 'Send my address to the model'), false);
});
test('model projection never forwards raw tool results, metadata or replayed actions', () => {
  const output = { _meta: { sessionToken: 'PRIVATE-FIXTURE' }, content: [{ type: 'text', text: JSON.stringify({ stores: [{ id: 's1', name: 'Shop', platform: 'openfront', sessionToken: 'PRIVATE-FIXTURE', logoIcon: '<svg onload=attack()>' }] }) }] };
  const projected = projectMarketplaceToolOutput('getAvailableStores', output);
  assert.match(projected.value, /Shop/);
  assert.doesNotMatch(projected.value, /PRIVATE-FIXTURE|logoIcon|<svg/);
  assert.doesNotMatch(projectMarketplaceToolOutput('completeCart', output).value, /PRIVATE-FIXTURE/);
  const replay = projectMarketplaceMessagesForModel([{ id: 'm1', role: 'assistant', parts: [{ type: 'dynamic-tool', output }] }]);
  assert.deepEqual(replay, []);
});
