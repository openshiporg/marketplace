import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { completedOrderUrl, retryPaidIntent } from '../lib/complete-paid-cart.ts';
import { addToCartErrorMessage, INVALID_CART_ARGUMENTS_MESSAGE, ORDER_COMPLETION_FALLBACK } from '../lib/mcp-customer-error.ts';
import { buildMarketplaceMcpHeaders } from '../lib/mcp-client-headers.ts';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('completeCart uses the common proof-bearing headers', () => {
  const headers = buildMarketplaceMcpHeaders();
  assert.deepEqual(JSON.parse(headers['x-cart-proofs']), {});
  assert.ok(headers['x-cart-ids']);
  const component = source('features/marketplace/components/tool-invocation.tsx');
  assert.match(component, /headers: buildMarketplaceMcpHeaders\(storeId\)/);
  assert.doesNotMatch(component, /'x-cart-ids'/);
});

test('completion errors reject with exact source copy; success alone produces a confirmation', () => {
  const message = 'Stack Kitchen cannot complete this cart.';
  assert.throws(() => completedOrderUrl({ error: { message } }, null), { message });
  assert.throws(() => completedOrderUrl({}, null), { message: ORDER_COMPLETION_FALLBACK });
  assert.equal(completedOrderUrl({ result: {} }, { redirectUrl: 'https://restaurant.example/order/1' }), 'https://restaurant.example/order/1');
  const form = source('features/marketplace/components/payment/payment-ui.tsx');
  assert.match(form, /setErrorMessage\(error.message \|\| ORDER_COMPLETION_FALLBACK\)/);
  assert.match(form, /role="alert"/);
  assert.match(form, /Keep the form mounted/);
});

test('a succeeded payment retries completion, retains failure, and never reconfirms', async () => {
  let completions = 0;
  await assert.rejects(retryPaidIntent(async () => ({ paymentIntent: { status: 'succeeded' } }), async () => {
    completions++;
    throw new Error('Source completion error');
  }), /Source completion error/);
  assert.equal(completions, 1);
  assert.equal(await retryPaidIntent(async () => ({ paymentIntent: { status: 'succeeded' } }), async () => { completions++; }), true);
  assert.equal(await retryPaidIntent(async () => ({ paymentIntent: { status: 'requires_payment_method' } }), async () => { throw new Error('must not complete'); }), false);
  const form = source('features/marketplace/components/payment/payment-ui.tsx');
  assert.ok(form.indexOf('await retryPaidIntent(') < form.indexOf('await stripe.confirmCardPayment('));
});

test('typed restaurant copy is verbatim, invalid arguments remain Marketplace-owned', () => {
  const message = 'Stack Kitchen is closed right now. Ordering opens at Mon 11:00 AM EST.';
  assert.equal(addToCartErrorMessage({ message, data: { code: 'RESTAURANT_CLOSED' } }, 'generic'), message);
  assert.equal(addToCartErrorMessage({ data: { copy: message } }, 'generic'), message);
  assert.equal(addToCartErrorMessage({ message, data: { code: 'INVALID_TOOL_ARGUMENTS' } }, 'generic'), INVALID_CART_ARGUMENTS_MESSAGE);
  assert.equal(addToCartErrorMessage({}, 'generic'), 'generic');
  assert.match(source('features/marketplace/components/ai-message.tsx'), /addToCartErrorMessage\(result\?\.error \|\| responseData\?\.error/);
});
