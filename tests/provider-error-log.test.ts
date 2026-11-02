import test from 'node:test';
import assert from 'node:assert/strict';
import { providerErrorSummary } from '../lib/provider-error-log.ts';

test('summary keeps only status and code from a provider error', () => {
  const error = Object.assign(new Error('Bearer sk-or-secret in body'), { name: 'AI_APICallError', statusCode: 401, requestBodyValues: { key: 'x' }, data: { error: { message: 'User not found.', code: 401 } } });
  const summary = providerErrorSummary(error);
  assert.deepEqual(summary, { errorName: 'AI_APICallError', status: 401, code: '401' });
  assert.equal(JSON.stringify(summary).includes('secret'), false);
});
test('non-provider failures report only the name', () => {
  assert.deepEqual(providerErrorSummary(new TypeError('boom')), { errorName: 'TypeError' });
  assert.deepEqual(providerErrorSummary('x'), { errorName: 'UnknownError' });
});
