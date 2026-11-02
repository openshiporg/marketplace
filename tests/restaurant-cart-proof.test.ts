import test from 'node:test';
import assert from 'node:assert/strict';
import { cartCookie } from '../app/api/mcp-transport/adapters/openfront-restaurant/index.ts';
import { SourceGraphQLError } from '../app/api/mcp-transport/tools/utils.ts';

test('source cart proof rides in the source-scoped cart cookie, never the marketplace jar', () => {
  assert.equal(cartCookie('marketplace=secret', 'c1'), '_restaurant_cart_id=c1');
  assert.equal(cartCookie('marketplace=secret', 'c1', 'v1.c1.9.sig'), '_restaurant_cart_id=c1; _restaurant_cart_proof=v1.c1.9.sig');
});

test('a source closed-hours GraphQL error becomes customer copy with its code', () => {
  const error = new SourceGraphQLError([{ message: 'Stack Kitchen is closed right now. Ordering opens at Mon, 11:00 AM EST.', extensions: { code: 'RESTAURANT_CLOSED', opensAt: '2026-11-02T16:00:00.000Z' } }]);
  assert.equal(error.customerError.code, 'RESTAURANT_CLOSED');
  assert.match(error.message, /^Stack Kitchen is closed right now/);
});
