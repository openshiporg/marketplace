import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  InvalidCompletionTokenBudgetError,
  resolveCompletionMaxOutputTokens,
  SHARED_MAX_OUTPUT_TOKENS_DEFAULT,
} from '../lib/completion-token-budget.ts';

const repoRoot = process.cwd();

const budget = (config: Partial<Parameters<typeof resolveCompletionMaxOutputTokens>[0]> = {}) =>
  resolveCompletionMaxOutputTokens({
    useGlobalKeys: false,
    openRouterMaxTokens: undefined,
    hasRequestMaxTokens: false,
    requestMaxTokens: undefined,
    ...config,
  });

test('completion token budgets strictly validate the active mode without changing BYOK budgets', () => {
  assert.equal(SHARED_MAX_OUTPUT_TOKENS_DEFAULT, 4_000);
  assert.equal(budget({ useGlobalKeys: true }), 4_000);
  assert.equal(budget({ useGlobalKeys: true, openRouterMaxTokens: ' 8000 ' }), 8_000);
  assert.equal(budget({
    useGlobalKeys: true,
    openRouterMaxTokens: '50000',
    hasRequestMaxTokens: true,
    requestMaxTokens: 'malformed-body-value',
  }), 50_000, 'shared mode uses only the operator budget, not caller body input');
  assert.throws(
    () => budget({ useGlobalKeys: true, openRouterMaxTokens: '4000junk' }),
    InvalidCompletionTokenBudgetError,
  );

  assert.equal(budget(), undefined, 'missing BYOK budget preserves provider-default behavior');
  assert.equal(budget({ hasRequestMaxTokens: true, requestMaxTokens: '16000' }), 16_000);
  assert.equal(budget({ hasRequestMaxTokens: true, requestMaxTokens: 50_000 }), 50_000,
    'no new BYOK cap is imposed');

  for (const value of [
    '', '   ', '4000junk', '4e3', '1.5', '+4000', '0', '-1', 0, -1, 1.5,
    null, true, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(
      () => budget({ useGlobalKeys: true, openRouterMaxTokens: String(value) }),
      InvalidCompletionTokenBudgetError,
      `reject malformed shared setting ${String(value)}`,
    );
    assert.throws(
      () => budget({ hasRequestMaxTokens: true, requestMaxTokens: value }),
      InvalidCompletionTokenBudgetError,
      `reject malformed explicit BYOK setting ${String(value)}`,
    );
  }
  assert.throws(
    () => budget({ useGlobalKeys: true, openRouterMaxTokens: '0' }),
    (error) => error instanceof InvalidCompletionTokenBudgetError && error.source === 'shared-config',
  );
  assert.throws(
    () => budget({ hasRequestMaxTokens: true, requestMaxTokens: '0' }),
    (error) => error instanceof InvalidCompletionTokenBudgetError && error.source === 'request',
  );
});

test('completion route validates token budget before provider or MCP setup', () => {
  const route = readFileSync(resolve(repoRoot, 'app/api/completion/route.ts'), 'utf8');
  const budgetValidation = route.indexOf('resolveCompletionMaxOutputTokens({');
  assert.ok(budgetValidation >= 0, 'route resolves the token budget');

  for (const effect of [
    'assertTrustedHttpsEndpoint(baseURL, endpointPolicy)',
    'createOpenAI({',
    'await getBaseUrl()',
    'new StreamableHTTPClientTransport(',
    'createMCPClient({ transport })',
    'await mcpClient.tools()',
    'createOpenRouter({ apiKey })(model)',
    'streamText(streamTextConfig)',
  ]) {
    const effectPosition = route.indexOf(effect);
    assert.ok(effectPosition > budgetValidation, `${effect} occurs only after budget validation`);
  }
  assert.match(route, /error instanceof InvalidCompletionTokenBudgetError[\s\S]*?error\.source === 'shared-config'[\s\S]*?status: 503[\s\S]*?status: 400/);
});
