import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceCustomerError } from '../lib/source-customer-errors';

test('closed restaurant keeps source name, local time, code and opening instant', () => {
  const message = 'Stack Kitchen is closed right now. Ordering opens at Mon 11:00 AM EST.';
  assert.deepEqual(sourceCustomerError([{ message, extensions: { code: 'RESTAURANT_CLOSED', opensAt: '2026-11-02T16:00:00Z' } }]), { message, code: 'RESTAURANT_CLOSED', opensAt: '2026-11-02T16:00:00Z' });
});
test('maps the service-period contract', () => {
  assert.deepEqual(sourceCustomerError([{ extensions: { code: 'OUTSIDE_SERVICE_PERIOD' } }]), { message: 'This item is outside its menu service period.', code: 'OUTSIDE_SERVICE_PERIOD' });
});
test('unknown codes use source copy; generic is the last resort', () => {
  assert.deepEqual(sourceCustomerError([{ message: 'Source copy.', extensions: { code: 'DEMO_ITEM_NOT_FOR_SALE' } }]), { message: 'Source copy.' });
  assert.deepEqual(sourceCustomerError([{ message: 'Choose an available option.', extensions: { code: 'NEW_RULE' } }]), { message: 'Choose an available option.' });
  assert.deepEqual(sourceCustomerError([{}]), { message: 'Unexpected error.' });
});
