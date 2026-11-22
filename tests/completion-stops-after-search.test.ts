import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// A typed search must run discovery after the forced store lookup; the stores card must not end the turn.
test('the store list card does not stop the answer before discovery', () => {
  const route = readFileSync(new URL('../app/api/completion/route.ts', import.meta.url), 'utf8');
  const fn = route.slice(route.indexOf('function latestStepReturnedUiResource'), route.indexOf('type ScopedMcpRequest'));
  assert.match(fn, /toolName === 'getAvailableStores'\) return false/);
});
