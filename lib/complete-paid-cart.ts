import { mcpCustomerError, ORDER_COMPLETION_FALLBACK } from './mcp-customer-error';

/** Completion errors must reject so the payment form retains the paid attempt. */
export function completedOrderUrl(result: any, data: any): string {
  if (result?.error || data?.error || !result?.result || typeof data?.redirectUrl !== 'string') {
    throw new Error(mcpCustomerError(result?.error || data?.error, ORDER_COMPLETION_FALLBACK));
  }
  return data.redirectUrl;
}

/** A paid intent is an order-completion retry, not another card confirmation. */
export async function retryPaidIntent(
  retrieve: () => Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>,
  complete: () => Promise<void>,
): Promise<boolean> {
  const existing = await retrieve();
  if (existing.error) throw new Error(existing.error.message || ORDER_COMPLETION_FALLBACK);
  if (existing.paymentIntent?.status !== 'succeeded' && existing.paymentIntent?.status !== 'requires_capture') return false;
  await complete();
  return true;
}
