import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { paymentSessionIsCurrent } from '../lib/payment-session-current.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('a payment form charges only while its session is still the cart selection', () => {
  const cart = { paymentCollection: { paymentSessions: [{ id: 'ps_1', isSelected: true, data: {} }] } };
  assert.equal(paymentSessionIsCurrent(cart, 'ps_1'), true);
  // Every E-commerce cart change detaches the payment collection.
  assert.equal(paymentSessionIsCurrent({ paymentCollection: null }, 'ps_1'), false);
  assert.equal(paymentSessionIsCurrent(cart, 'ps_old'), false);
  assert.equal(paymentSessionIsCurrent({ paymentCollection: { paymentSessions: [{ id: 'ps_1', isSelected: false }] } }, 'ps_1'), false);
  assert.equal(paymentSessionIsCurrent({ paymentCollection: { paymentSessions: [{ id: 'ps_1', isSelected: true, data: { state: 'cancelled' } }] } }, 'ps_1'), false);
});

test('the card form checks the cart before confirming a card', () => {
  const ui = read('features/marketplace/components/payment/payment-ui.tsx');
  assert.ok(ui.indexOf('await onBeforePay?.()') < ui.indexOf('stripe.confirmCardPayment('));
  // PayPal retries completion only, never a second capture.
  assert.match(ui, /complete\(capturedOrderId\)/);
});

test('the E-commerce checkout link carries the cart proof', () => {
  assert.match(read('app/api/mcp-transport/adapters/openfront/index.ts'), /\/api\/cart-recover\?p=\$\{encodeURIComponent\(cartProof\)\}/);
  const cartTools = read('app/api/mcp-transport/tools/cart-tools.ts');
  assert.equal((cartTools.match(/buildCheckoutLink\(\{ store, cartId, countryCode, cartProof: cartProofFor\(storeId, cartId\) \}\)/g) || []).length, 2);
  // A cart completed elsewhere is replaced on the next add.
  assert.match(cartTools, /sourceCodes\.includes\('CART_COMPLETED'\)/);
});

test('a Restaurant cart releases an unpaid payment attempt before it changes', () => {
  const adapter = read('app/api/mcp-transport/adapters/openfront-restaurant/index.ts');
  assert.match(adapter, /cancelCheckoutPaymentSession\(cartId: \$cartId, paymentSessionId: \$paymentSessionId\)/);
  assert.equal((adapter.match(/await releaseUnpaidAttempt\(/g) || []).length, 6);
});

test('the assistant prompt lists only the tools the model has', () => {
  const route = read('app/api/completion/route.ts');
  for (const tool of ['getOrCreateCart', 'addToCart', 'initiatePaymentSession', 'completeCart']) {
    assert.doesNotMatch(route.slice(route.indexOf('AVAILABLE TOOLS:')), new RegExp(tool));
  }
});
