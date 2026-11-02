/** Bounded, secret-free summary of an AI provider failure: status and code only, never bodies, headers or keys. */
export function providerErrorSummary(error: unknown): { errorName: string; status?: number; code?: string } {
  const e = error as any;
  const cause = e?.cause ?? e?.lastError;
  const status = [e?.statusCode, e?.status, cause?.statusCode, cause?.status].find((v) => Number.isInteger(v));
  const rawCode = e?.data?.error?.code ?? cause?.data?.error?.code ?? e?.code;
  const code = typeof rawCode === 'string' || typeof rawCode === 'number' ? String(rawCode).slice(0, 64) : undefined;
  return {
    errorName: error instanceof Error ? error.name : 'UnknownError',
    ...(status !== undefined ? { status } : {}),
    ...(code ? { code } : {}),
  };
}
