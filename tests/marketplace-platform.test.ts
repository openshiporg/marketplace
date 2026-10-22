import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasMatchingSourceIdentity, legacySourceIdFor, MarketplaceSourceSelectionError,
  normalizeSourceBaseUrl, selectAdmittedSourceDirectory, sourceIdFor,
} from '../lib/source-identity.ts';
import { getCartId, getCartProof, removeCartId } from '../lib/cart-storage.ts';
import { getSessionToken, removeSession } from '../lib/session-storage.ts';

test('versioned source IDs are injective and reject wrong origin/platform identities', () => {
  assert.equal(normalizeSourceBaseUrl('https://shop.example///'), 'https://shop.example');
  const retail = { baseUrl: 'https://shop.example', platform: 'openfront' as const };
  const restaurant = { baseUrl: 'https://shop.example', platform: 'openfront-restaurant' as const };
  assert.notEqual(sourceIdFor(retail), sourceIdFor(restaurant));
  assert.notEqual(sourceIdFor(retail), legacySourceIdFor(retail));

  const slashPath = { baseUrl: 'https://shop.example/foo/bar', platform: 'openfront' as const };
  const escapedLookingPath = { baseUrl: 'https://shop.example/foo_2Fbar', platform: 'openfront' as const };
  assert.equal(legacySourceIdFor(slashPath), legacySourceIdFor(escapedLookingPath), 'reproduces the legacy percent-to-underscore collision');
  assert.notEqual(sourceIdFor(slashPath), sourceIdFor(escapedLookingPath));
  const ambiguousPaths = ['/foo/bar', '/foo_2Fbar', '/foo_5Fbar', '/foo%2Fbar', '/foo%5Fbar'];
  const versionedIds = ambiguousPaths.map(path => sourceIdFor({ baseUrl: `https://shop.example${path}`, platform: 'openfront' }));
  assert.equal(new Set(versionedIds).size, ambiguousPaths.length);

  assert.equal(hasMatchingSourceIdentity(escapedLookingPath, { ...escapedLookingPath, id: legacySourceIdFor(escapedLookingPath) }), true);
  assert.equal(hasMatchingSourceIdentity(escapedLookingPath, { ...slashPath, id: legacySourceIdFor(escapedLookingPath) }), false);
  const replacement = {
    ...escapedLookingPath,
    id: sourceIdFor(escapedLookingPath),
    endpoint: 'https://shop.example/foo_2Fbar/api/graphql',
  };
  assert.throws(() => selectAdmittedSourceDirectory([replacement], [
    { ...slashPath, id: legacySourceIdFor(slashPath) },
  ]), MarketplaceSourceSelectionError);
  const legacyProofs = { [legacySourceIdFor(slashPath)]: 'proof-from-old-path' };
  assert.equal(legacyProofs[replacement.id], undefined, 'the old colliding map key cannot be selected under v2');
  assert.equal(hasMatchingSourceIdentity(retail, { ...restaurant, id: sourceIdFor(retail) }), false);
  assert.throws(() => normalizeSourceBaseUrl('http://shop.example'), /HTTPS/);
  assert.throws(() => normalizeSourceBaseUrl('https://user:password@shop.example'), /credentials/);
});

test('legacy cart/proof/session keys stay orphaned under v2 and server store IDs remain exact', () => {
  const staleIdentity = { baseUrl: 'https://shop.example/foo/bar', platform: 'openfront' as const };
  const currentIdentity = { baseUrl: 'https://shop.example/foo_2Fbar', platform: 'openfront' as const };
  const legacyId = legacySourceIdFor(staleIdentity);
  const currentId = sourceIdFor(currentIdentity);
  assert.equal(legacyId, legacySourceIdFor(currentIdentity), 'the old key is adversarially shared by both identities');

  const admitted = {
    ...currentIdentity,
    id: currentId,
    endpoint: 'https://shop.example/foo_2Fbar/api/graphql',
  };
  const migratedDirectory = selectAdmittedSourceDirectory([admitted], [{
    ...currentIdentity,
    id: legacyId,
  }]);
  assert.equal(migratedDirectory[0].id, currentId, 'v1 config compatibility canonicalizes to v2');
  assert.throws(() => selectAdmittedSourceDirectory([admitted], [{
    ...staleIdentity,
    id: legacyId,
  }]), MarketplaceSourceSelectionError, 'the colliding v1 ID cannot admit the other endpoint');

  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>([
    ['openfront_marketplace_carts', JSON.stringify({ [legacyId]: {
      cartId: 'legacy-cart', cartProof: 'legacy-proof', createdAt: 1,
    } })],
    ['openfront_marketplace_sessions', JSON.stringify({ [legacyId]: {
      token: 'legacy-session', savedAt: 1,
    } })],
  ]);
  const fakeStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: () => true },
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStorage });
  try {
    assert.equal(getCartId(currentId), null);
    assert.equal(getCartProof(currentId), null);
    assert.equal(getSessionToken(currentId), null);
    assert.equal(getCartId(legacyId), 'legacy-cart', 'upgrade does not silently rewrite the old local entry');

    removeCartId(legacyId);
    removeSession(legacyId);
    assert.equal(getCartId(legacyId), null, 'removeCartId clears the orphaned cart and its proof');
    assert.equal(getCartProof(legacyId), null);
    assert.equal(getSessionToken(legacyId), null, 'removeSession clears only the orphaned session key');

    values.set('openfront_marketplace_carts', JSON.stringify({ [currentId]: {
      cartId: 'fresh-v2-cart', cartProof: 'fresh-v2-proof', createdAt: 2,
    } }));
    values.set('openfront_marketplace_sessions', JSON.stringify({ [currentId]: {
      token: 'fresh-v2-session', savedAt: 2,
    } }));
    assert.equal(getCartId(currentId), 'fresh-v2-cart');
    assert.equal(getCartProof(currentId), 'fresh-v2-proof');
    assert.equal(getSessionToken(currentId), 'fresh-v2-session');
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldLocalStorage) Object.defineProperty(globalThis, 'localStorage', oldLocalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }

});

test('admitted source selection rejects stale/duplicate identities but permits reorder and relabel', () => {
  const first = {
    id: sourceIdFor({ baseUrl: 'https://first.example', platform: 'openfront' }),
    baseUrl: 'https://first.example',
    platform: 'openfront' as const,
    endpoint: 'https://first.example/api/graphql',
    name: 'First',
  };
  const second = {
    id: sourceIdFor({ baseUrl: 'https://second.example', platform: 'openfront-restaurant' }),
    baseUrl: 'https://second.example',
    platform: 'openfront-restaurant' as const,
    endpoint: 'https://second.example/api/graphql',
    name: 'Second',
  };
  const reordered = selectAdmittedSourceDirectory([first, second], [
    { id: second.id, baseUrl: second.baseUrl, platform: second.platform, name: 'Kitchen' },
    { id: first.id, baseUrl: first.baseUrl, platform: first.platform, storeName: 'Clothing' },
  ]);
  assert.deepEqual(reordered.map(source => [source.id, source.endpoint, source.name]), [
    [second.id, second.endpoint, 'Kitchen'],
    [first.id, first.endpoint, 'Clothing'],
  ]);

  assert.throws(() => selectAdmittedSourceDirectory([first], [
    { id: first.id, baseUrl: 'https://attacker.example', platform: first.platform },
  ]), MarketplaceSourceSelectionError);
  assert.throws(() => selectAdmittedSourceDirectory([first], [
    { id: first.id, baseUrl: first.baseUrl, platform: 'openfront-restaurant' },
  ]), MarketplaceSourceSelectionError);
  assert.throws(() => selectAdmittedSourceDirectory([first], [
    { id: first.id, baseUrl: first.baseUrl, platform: first.platform },
    { id: first.id, baseUrl: first.baseUrl, platform: first.platform },
  ]), MarketplaceSourceSelectionError);

  const legacyStore = { ...first, id: legacySourceIdFor(first) };
  const migrated = selectAdmittedSourceDirectory([first], [legacyStore]);
  const oldCartProofs = { [legacyStore.id]: 'old-proof' };
  const oldSessionTokens = { [legacyStore.id]: 'old-session' };
  assert.equal(migrated[0].id, first.id, 'an exact legacy config identity resolves to the current canonical ID');
  assert.equal(oldCartProofs[migrated[0].id], undefined, 'legacy proof maps do not cross the ID namespace');
  assert.equal(oldSessionTokens[migrated[0].id], undefined, 'legacy session maps do not cross the ID namespace');
});
