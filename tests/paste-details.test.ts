import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePastedDetails } from '../mcp-ui/runtime/paste.ts';

test('a pasted address block fills every field it plainly contains', () => {
  assert.deepEqual(parsePastedDetails('John Doe\njohn@email.com\n123 Main St\nNew York, NY 10001\nUSA\n+1 (555) 123-4567'), {
    email: 'john@email.com', phone: '+1 (555) 123-4567', countryCode: 'us', address1: '123 Main St',
    city: 'New York', province: 'NY', postalCode: '10001', name: 'John Doe', firstName: 'John', lastName: 'Doe',
  });
});

test('one comma-separated line is split and the city keeps its state and postal code', () => {
  const r = parsePastedDetails('Fable Launch, 1600 Main St, Dallas, TX 75201, fable@example.com, 214-555-0142');
  assert.equal(r.address1, '1600 Main St');
  assert.equal(r.city, 'Dallas');
  assert.equal(r.province, 'TX');
  assert.equal(r.postalCode, '75201');
  assert.equal(r.email, 'fable@example.com');
  assert.equal(r.phone, '214-555-0142');
  assert.equal(r.firstName, 'Fable');
});

test('an apartment line and a Canadian postal code are kept', () => {
  const r = parsePastedDetails('Ana María López\nana@x.ca\n55 King St W\nApt 1203\nToronto, ON M5V 2T6\nCanada\n416 555 0199');
  assert.equal(r.address2, 'Apt 1203');
  assert.equal(r.postalCode, 'M5V 2T6');
  assert.equal(r.countryCode, 'ca');
  assert.equal(r.lastName, 'María López');
});

test('nothing is invented when the paste has no address', () => {
  assert.deepEqual(parsePastedDetails('hello'), {});
});
