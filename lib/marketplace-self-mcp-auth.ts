import {
  MCP_TRANSPORT_REQUEST_MAX_BYTES,
  readJsonBodyBounded,
} from './request-budgets.ts';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Add only the session token keyed by a valid MCP tool-call storeId. Parse a
 * bounded clone so the untouched SDK Request can still be forwarded to the
 * local MCP route, which applies the same ingress limit itself.
 */
export async function attachStoreScopedSessionAuthorization(
  request: Request,
  headers: Headers,
  sessionTokens: Record<string, string>,
): Promise<void> {
  if (request.signal.aborted) return;

  let payload: unknown;
  try {
    payload = await readJsonBodyBounded<unknown>(
      request.clone(),
      MCP_TRANSPORT_REQUEST_MAX_BYTES,
    );
  } catch {
    // Malformed, oversized, chunk-exhausted, or aborted clones never gain a bearer.
    return;
  }
  if (request.signal.aborted) return;

  if (!isRecord(payload) || payload.method !== 'tools/call' || !isRecord(payload.params)) return;
  const args = payload.params.arguments;
  if (!isRecord(args)) return;

  const storeId = args.storeId;
  if (typeof storeId !== 'string' || storeId.length < 1 || storeId.length > 160
    || !Object.prototype.hasOwnProperty.call(sessionTokens, storeId)) return;

  const token = sessionTokens[storeId];
  if (typeof token !== 'string' || token.length < 1 || token.length > 4_096
    || /[\u0000-\u001f\u007f]/.test(token)) return;

  try {
    headers.set('Authorization', `Bearer ${token}`);
  } catch {
    // Malformed map values fail closed instead of preventing local MCP dispatch.
  }
}
