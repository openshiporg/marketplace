'use client';

import { getAllCartIds, getAllCartProofs } from '@/lib/cart-storage';
import { getMarketplaceConfig } from '@/lib/marketplace-storage';
import { getSessionToken } from '@/lib/session-storage';

/**
 * Build a fresh MCP request header set at call time. Cart IDs and their
 * source-issued proofs are kept in separate source-keyed maps so one store's
 * guest cart credentials can never be sent as another store's credentials.
 */
export function buildMarketplaceMcpHeaders(storeId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-cart-ids': JSON.stringify(getAllCartIds()),
    'x-cart-proofs': JSON.stringify(getAllCartProofs()),
    'x-marketplace-config': JSON.stringify(getMarketplaceConfig()),
  };

  const token = getSessionToken(storeId);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
