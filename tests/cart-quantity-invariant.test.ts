import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateJsonSchema } from '../lib/request-budgets.ts';

const source = readFileSync(new URL('../app/api/mcp-transport/tools/cart-tools.ts', import.meta.url), 'utf8');
const quantitySchema = { type: 'integer', minimum: 1, maximum: 1000 } as const;

test('cart quantity schemas are whole numbers from 1 to the line bound', () => {
  const declared = source.match(/quantity: \{\s*type: 'integer',\s*minimum: 1,\s*maximum: MAX_LINE_QUANTITY,/g) ?? [];
  assert.equal(declared.length, 2, 'addToCart and updateCartItem both declare an integer quantity');
  assert.doesNotMatch(source, /quantity: \{\s*type: 'number'/);
  assert.equal((source.match(/!Number\.isSafeInteger\(quantity\) \|\| quantity <= 0/g) ?? []).length, 2);
});

test('the transport validator refuses fractional, tiny, zero and oversized quantities', () => {
  const schema = { type: 'object', properties: { quantity: quantitySchema }, required: ['quantity'] };
  for (const quantity of [2.5, 1e-9, 0, -1, 1001]) assert.equal(validateJsonSchema({ quantity }, schema).valid, false, String(quantity));
  for (const quantity of [1, 3, 1000]) assert.equal(validateJsonSchema({ quantity }, schema).valid, true, String(quantity));
});
