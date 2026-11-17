export const PAYMENT_SESSION_STALE = 'This cart changed after the payment form opened. Open payment again from the cart.';

/** A payment form may charge only while the shop still holds its session as the cart's selected one. */
export function paymentSessionIsCurrent(cart: any, paymentSessionId: string): boolean {
  const sessions = cart?.paymentCollection?.paymentSessions;
  if (!Array.isArray(sessions)) return false;
  return sessions.some((session: any) => session?.id === paymentSessionId && session?.isSelected !== false
    && session?.data?.state !== 'cancelled');
}
