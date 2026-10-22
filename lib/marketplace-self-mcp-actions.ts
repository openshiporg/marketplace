import { readJsonResponseBounded } from './request-budgets.ts';

/**
 * The self-MCP envelope contains a serialized tool-result text as well as the
 * normal JSON-RPC encoding. Eight MiB leaves headroom above the 2 MiB source
 * GraphQL cart-response budget and its nested JSON escaping, while remaining a
 * finite bound for this secondary action parser.
 */
export const MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES = 8 * 1024 * 1024;

export type MarketplaceSelfMcpActionState = {
  cartIds: Record<string, string>;
  cartProofs: Record<string, string>;
  sessionTokens: Record<string, string>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Apply only the local self-MCP lifecycle hints. Parsing is intentionally
 * secondary to the MCP SDK: a bounded clone is consumed, and any malformed,
 * cancelled, or oversized clone is ignored without touching the SDK response.
 */
export async function applyMarketplaceSelfMcpActions(
  response: Response,
  state: MarketplaceSelfMcpActionState,
): Promise<void> {
  try {
    const rpc = await readJsonResponseBounded<unknown>(
      response.clone(),
      MARKETPLACE_SELF_MCP_ACTION_RESPONSE_MAX_BYTES,
    );
    if (!isRecord(rpc) || !isRecord(rpc.result) || !Array.isArray(rpc.result.content)) return;

    const content = rpc.result.content;
    const metadata = isRecord(rpc.result._meta) ? rpc.result._meta : undefined;
    const marketplace = metadata && isRecord(metadata.marketplace) ? metadata.marketplace : undefined;
    const metaAction = marketplace?.clientAction;

    for (const item of content) {
      if (!isRecord(item) || item.type !== 'text' || typeof item.text !== 'string') continue;
      const parsed: unknown = JSON.parse(item.text);
      const data = isRecord(parsed) ? parsed : undefined;
      const action = metaAction || data?.__clientAction;
      const actionRecord = isRecord(action) ? action : undefined;
      const storeId = typeof actionRecord?.storeId === 'string'
        ? actionRecord.storeId
        : typeof data?.storeId === 'string' ? data.storeId : undefined;

      if (actionRecord?.type === 'saveCartId' && storeId && typeof actionRecord.cartId === 'string') {
        state.cartIds[storeId] = actionRecord.cartId;
        if (typeof actionRecord.cartProof === 'string') state.cartProofs[storeId] = actionRecord.cartProof;
      }
      if (actionRecord?.type === 'saveSessionToken' && storeId && typeof actionRecord.sessionToken === 'string') {
        state.sessionTokens[storeId] = actionRecord.sessionToken;
        if (typeof actionRecord.activeCartId === 'string') state.cartIds[storeId] = actionRecord.activeCartId;
      }
      if (data?.clearCartId === true && typeof storeId === 'string') {
        delete state.cartIds[storeId];
        delete state.cartProofs[storeId];
      }
    }
  } catch {
    // Lifecycle, UI-resource, cancelled, and over-budget clones do not affect
    // the original MCP response or its consumer-visible result.
  }
}
