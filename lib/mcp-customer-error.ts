type ToolError = { message?: unknown; data?: { copy?: unknown; code?: unknown } };

export const ORDER_COMPLETION_FALLBACK = 'The store could not place this order. Your card was not charged twice; please try again.';
export const INVALID_CART_ARGUMENTS_MESSAGE = 'Marketplace rejected this add-to-cart request before it reached the store. This is a Marketplace problem, not the store; please report it.';

export function mcpCustomerError(error: ToolError | undefined, fallback: string): string {
  for (const copy of [error?.data?.copy, error?.message]) {
    if (typeof copy === 'string' && copy.trim()) return copy;
  }
  return fallback;
}

export function addToCartErrorMessage(error: ToolError | undefined, fallback: string): string {
  return error?.data?.code === 'INVALID_TOOL_ARGUMENTS'
    ? INVALID_CART_ARGUMENTS_MESSAGE
    : mcpCustomerError(error, fallback);
}
