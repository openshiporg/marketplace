import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sourceIdFor } from '../lib/source-identity.ts';
import { SOURCE_ID_RENAMES } from '../lib/source-renames.ts';
import { getAllCarts, getCartId, getCartProof } from '../lib/cart-storage.ts';
import { getAllSessions, getSessionToken } from '../lib/session-storage.ts';

const oldTees = sourceIdFor({ baseUrl: 'https://impossible-tees.openship.org', platform: 'openfront' });
const newTees = sourceIdFor({ baseUrl: 'https://e-commerce.openship.org', platform: 'openfront' });
const oldBurgers = sourceIdFor({ baseUrl: 'https://craft-burgers.openship.org', platform: 'openfront-restaurant' });
const newBurgers = sourceIdFor({ baseUrl: 'https://restaurant.openship.org', platform: 'openfront-restaurant' });

test('the bundled directory uses the new demo hostnames and exact v2 IDs', () => {
  const config = JSON.parse(readFileSync(new URL('../marketplace.config.json', import.meta.url), 'utf-8'));
  const raw = JSON.stringify(config);
  assert.doesNotMatch(raw, /impossible-tees|craft-burgers/);
  for (const store of config) assert.equal(store.id, sourceIdFor(store));
  const ids = config.map((store: { id: string }) => store.id);
  assert.ok(ids.includes(newTees));
  assert.ok(ids.includes(newBurgers));
  assert.deepEqual(SOURCE_ID_RENAMES, { [oldTees]: newTees, [oldBurgers]: newBurgers });
});

test('carts, proofs and sessions keyed by the old hostnames move to the new IDs without duplicates', () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>([
    ['openfront_marketplace_carts', JSON.stringify({
      [oldTees]: { cartId: 'tees-cart', cartProof: 'tees-proof', createdAt: 1 },
      [oldBurgers]: { cartId: 'stale-burger-cart', createdAt: 1 },
      [newBurgers]: { cartId: 'fresh-burger-cart', createdAt: 2 },
    })],
    ['openfront_marketplace_sessions', JSON.stringify({
      [oldBurgers]: { token: 'burger-session', savedAt: 1 },
    })],
  ]);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
  });
  try {
    assert.equal(getCartId(newTees), 'tees-cart');
    assert.equal(getCartProof(newTees), 'tees-proof');
    assert.equal(getCartId(newBurgers), 'fresh-burger-cart', 'an existing new-ID entry wins');
    assert.deepEqual(Object.keys(getAllCarts()).sort(), [newBurgers, newTees].sort());
    assert.doesNotMatch(values.get('openfront_marketplace_carts')!, /impossible-tees|craft-burgers/, 'migration is persisted');

    assert.equal(getSessionToken(newBurgers), 'burger-session');
    assert.deepEqual(Object.keys(getAllSessions()), [newBurgers]);
    assert.doesNotMatch(values.get('openfront_marketplace_sessions')!, /craft-burgers/);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldLocalStorage) Object.defineProperty(globalThis, 'localStorage', oldLocalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
