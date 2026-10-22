export const SHARED_MAX_OUTPUT_TOKENS_DEFAULT = 4_000;

export class InvalidCompletionTokenBudgetError extends Error {
  readonly source: 'shared-config' | 'request';

  constructor(source: 'shared-config' | 'request') {
    super('Max output tokens must be a positive safe integer');
    this.name = 'InvalidCompletionTokenBudgetError';
    this.source = source;
  }
}

/** Parse a decimal integer without parseInt prefix/truncation behavior. */
export function parsePositiveSafeInteger(
  value: unknown,
  source: 'shared-config' | 'request',
): number {
  let parsedValue = value;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) throw new InvalidCompletionTokenBudgetError(source);
    parsedValue = Number(normalized);
  }

  if (typeof parsedValue !== 'number'
    || !Number.isSafeInteger(parsedValue)
    || parsedValue < 1) {
    throw new InvalidCompletionTokenBudgetError(source);
  }

  return parsedValue;
}

export interface CompletionTokenBudgetConfig {
  useGlobalKeys: boolean;
  openRouterMaxTokens: string | undefined;
  hasRequestMaxTokens: boolean;
  requestMaxTokens: unknown;
}

/** Resolve only the active mode's budget; never apply the shared default to BYOK. */
export function resolveCompletionMaxOutputTokens({
  useGlobalKeys,
  openRouterMaxTokens,
  hasRequestMaxTokens,
  requestMaxTokens,
}: CompletionTokenBudgetConfig): number | undefined {
  if (useGlobalKeys) {
    return openRouterMaxTokens === undefined
      ? SHARED_MAX_OUTPUT_TOKENS_DEFAULT
      : parsePositiveSafeInteger(openRouterMaxTokens, 'shared-config');
  }

  return hasRequestMaxTokens ? parsePositiveSafeInteger(requestMaxTokens, 'request') : undefined;
}
