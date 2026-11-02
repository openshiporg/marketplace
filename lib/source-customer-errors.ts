export type SourceError = { message?: unknown; extensions?: { code?: unknown; opensAt?: unknown } };

/** Source-authored copy carries the store's real name and venue-local opening time. */
export function sourceCustomerError(errors: SourceError[]): { message: string; code?: string; opensAt?: string } {
  const known = errors.find(error => ['RESTAURANT_CLOSED', 'OUTSIDE_SERVICE_PERIOD'].includes(String(error.extensions?.code)));
  if (known) {
    const code = String(known.extensions?.code);
    const sourceMessage = typeof known.message === 'string' && known.message.trim() && known.message !== 'Unexpected error.' ? known.message : undefined;
    const message = sourceMessage || (code === 'OUTSIDE_SERVICE_PERIOD' ? 'This item is outside its menu service period.' : 'This restaurant is closed right now.');
    return { message, code, ...(typeof known.extensions?.opensAt === 'string' ? { opensAt: known.extensions.opensAt } : {}) };
  }
  const message = errors.find(error => typeof error.message === 'string' && error.message.trim())?.message;
  return { message: typeof message === 'string' ? message : 'Unexpected error.' };
}
