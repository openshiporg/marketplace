const REQUIRED_RESTAURANT_CART_MUTATIONS = [
  'createActiveCart',
  'addActiveCartItem',
] as const;

/**
 * Returns undefined when capability metadata is unavailable, otherwise whether
 * the source exposes the public Restaurant cart boundary Marketplace needs.
 */
export function restaurantCartMutationAvailability(value: unknown): boolean | undefined {
  if (!Array.isArray(value)) return undefined;
  const mutationNames = new Set(value.filter((name): name is string => typeof name === 'string'));
  return REQUIRED_RESTAURANT_CART_MUTATIONS.every((name) => mutationNames.has(name));
}
