export type LocalMerchant = { id: string; name: string; location: string; description: string; fulfillment: string[] };
export type LocalListing = { id: string; merchantId: string; collectionIds: string[]; title: string; description: string; price: number; currency: 'USD'; inventory: 'in-stock' | 'limited'; kind: string };
export type LocalCollection = { id: string; title: string; description: string };

export const LOCAL_MARKETPLACE_CATALOG = {
  disclosure: 'Clearly labeled mock data bundled with this deployment. No merchant endpoint, live inventory, checkout, or payment provider is contacted.',
  merchants: [
    { id: 'merchant-hearth-field', name: 'Hearth & Field', location: 'Kingston, NY', description: 'A small home-goods workshop making durable kitchen and table pieces.', fulfillment: ['Mock local pickup', 'Mock US shipping'] },
    { id: 'merchant-northline', name: 'Northline Supply', location: 'Duluth, MN', description: 'Repairable outdoor essentials designed for everyday use.', fulfillment: ['Mock US shipping'] },
    { id: 'merchant-daybreak', name: 'Daybreak Pantry', location: 'Portland, ME', description: 'Shelf-stable pantry staples from an imaginary neighborhood producer.', fulfillment: ['Mock local delivery', 'Mock pickup'] },
  ] satisfies LocalMerchant[],
  collections: [
    { id: 'collection-weekend-kitchen', title: 'Weekend kitchen', description: 'Practical tools and pantry goods for an unhurried meal.' },
    { id: 'collection-out-the-door', title: 'Out the door', description: 'Simple carry and outdoor goods for short trips.' },
    { id: 'collection-under-40', title: 'Under $40', description: 'Useful mock finds below forty dollars.' },
  ] satisfies LocalCollection[],
  listings: [
    { id: 'listing-maple-board', merchantId: 'merchant-hearth-field', collectionIds: ['collection-weekend-kitchen'], title: 'Maple prep board', description: 'Edge-grain maple board, 14 × 10 inches, finished with food-safe oil.', price: 6800, currency: 'USD', inventory: 'limited', kind: 'home goods' },
    { id: 'listing-linen-napkins', merchantId: 'merchant-hearth-field', collectionIds: ['collection-weekend-kitchen'], title: 'Washed linen napkins, set of four', description: 'Soft flax linen napkins in a natural oat color.', price: 3600, currency: 'USD', inventory: 'in-stock', kind: 'textiles' },
    { id: 'listing-field-tote', merchantId: 'merchant-northline', collectionIds: ['collection-out-the-door'], title: 'Waxed canvas field tote', description: 'A reinforced everyday tote with replaceable cotton webbing handles.', price: 7400, currency: 'USD', inventory: 'in-stock', kind: 'bags' },
    { id: 'listing-wool-cap', merchantId: 'merchant-northline', collectionIds: ['collection-out-the-door', 'collection-under-40'], title: 'Ribbed wool watch cap', description: 'Warm merino-blend cap in lake blue.', price: 3200, currency: 'USD', inventory: 'limited', kind: 'apparel' },
    { id: 'listing-granola', merchantId: 'merchant-daybreak', collectionIds: ['collection-weekend-kitchen', 'collection-under-40'], title: 'Maple rye granola', description: 'A mock 12 oz bag with rye flakes, pecans, maple, and sea salt.', price: 1400, currency: 'USD', inventory: 'in-stock', kind: 'pantry' },
    { id: 'listing-preserves', merchantId: 'merchant-daybreak', collectionIds: ['collection-weekend-kitchen', 'collection-under-40'], title: 'Blueberry lemon preserves', description: 'A clearly fictional small-batch 9 oz jar.', price: 1200, currency: 'USD', inventory: 'in-stock', kind: 'pantry' },
  ] satisfies LocalListing[],
} as const;
