import { safeHttpUrl } from '@/lib/safe-content';
import { getRestaurantCheckoutIssues, restaurantCheckoutIssueMessage } from '@/lib/restaurant-checkout';
import type { CardPayload, CartData, ConflictData, ErrorData, LoginData, PaymentChoice, ProductData } from '../types';
import { slimProduct, toDollars } from './slim';
import { renderMcpCard } from './shell';

const ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const clean = (record: Record<string, unknown>) => Object.fromEntries(Object.entries(record).map(([k, v]) => [k, str(v)]).filter(([, v]) => v));

export const productCardHtml = (storeId: string, countryCode: string, product: any, baseUrl?: string) =>
  renderMcpCard({ kind: 'product', data: { storeId, countryCode, product: slimProduct(product, baseUrl) } satisfies ProductData }, str(product.title));

export const loginCardHtml = (data: LoginData) => renderMcpCard({ kind: 'login', data }, 'Sign in');
export const conflictCardHtml = (data: ConflictData) => renderMcpCard({ kind: 'conflict', data }, 'Email already in use');
export const errorCardHtml = (data: ErrorData) => renderMcpCard({ kind: 'error', data }, data.title);
export const cartCardHtml = (data: CartData) => renderMcpCard({ kind: 'cart', data }, 'Cart');

/** Cart payload for an OpenFront (retail) cart. Source totals arrive as formatted strings; parse them to dollars. */
export function retailCartData(params: { storeId: string; cartId: string; cart: any; storeInfo: any; shippingOptions: any[] }): CartData {
  const { storeId, cartId, cart, storeInfo, shippingOptions } = params;
  const currency = cart.region?.currencyCode || cart.region?.currency?.code || 'USD';
  const num = (v: unknown) => (typeof v === 'string' ? toDollars(v) : toDollars(v));
  const items = (cart.lineItems ?? []).map((item: any) => ({
    id: str(item.id),
    label: str(item.title || item.productVariant?.product?.title),
    detail: str(item.productVariant?.title) || undefined,
    amount: num(item.unitPrice) ?? 0,
    quantity: Number.isSafeInteger(item.quantity) ? Math.max(1, Math.min(99, item.quantity)) : 1,
  }));
  const fees = [
    cart.shipping ? { label: 'Shipping', amount: num(cart.shipping) ?? 0 } : null,
    cart.tax ? { label: 'Taxes', amount: num(cart.tax) ?? 0 } : null,
    cart.discount ? { label: 'Discount', amount: -Math.abs(num(cart.discount) ?? 0) } : null,
  ].filter(Boolean) as CartData['fees'];
  const issues = [
    ...(!cart.lineItems?.length ? ['Add at least one item to the cart'] : []),
    ...(!cart.shippingAddress ? ['Add a shipping address'] : []),
    ...(!cart.shippingMethods?.length ? ['Select a shipping method'] : []),
  ];
  const lockTarget = !cart.lineItems?.length ? { tab: 'cart', label: 'Review cart' }
    : !cart.shippingAddress ? { tab: 'address', label: 'Add shipping address' }
    : { tab: 'shipping', label: 'Choose shipping method' };
  const providers: PaymentChoice[] = [
    ...(storeInfo?.paymentProviders ?? []).map((p: any) => p.provider).filter((p: string) => p === 'stripe' || p === 'paypal'),
    'checkout',
  ];
  const a = cart.shippingAddress ?? {};
  const selected = (cart.shippingMethods ?? []).map((m: any) => m.shippingOption?.id).find(Boolean);
  return {
    kind: 'retail', storeId, cartId, storeName: str(storeInfo?.name) || 'Checkout', currency, items, fees,
    total: num(cart.total) ?? items.reduce((n: number, i: any) => n + i.amount * i.quantity, 0),
    issues, lockTarget, providers,
    countryCode: str(cart.region?.countries?.[0]?.iso2 || 'us'),
    retail: {
      address: clean({ email: cart.email, firstName: a.firstName, lastName: a.lastName, address1: a.address1, city: a.city, province: a.province, postalCode: a.postalCode, countryCode: a.country?.iso2, phone: a.phone, company: a.company }),
      shippingOptions: shippingOptions.map((o: any) => ({
        id: str(o.id), name: str(o.name),
        price: str(o.calculatedAmount) || (typeof o.amount === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(o.amount / 100) : ''),
      })),
      selectedShippingId: selected ? str(selected) : undefined,
    },
  };
}

/** Cart payload for an OpenFront Restaurant cart (all money in minor units). */
export function restaurantCartData(params: { storeId: string; cartId: string; cart: any; storeInfo: any; storeUrl: string }): CartData {
  const { storeId, cartId, cart, storeInfo, storeUrl } = params;
  const currency = cart.currencyCode || 'USD';
  const d = (minor: unknown) => (Number(minor) || 0) / 100;
  const orderType: 'pickup' | 'delivery' = cart.orderType === 'delivery' ? 'delivery' : 'pickup';
  const configured = (amount: unknown) => {
    const parsed = Number.parseFloat(str(amount) || '0');
    return Number.isFinite(parsed) ? (ZERO_DECIMAL.includes(currency.toUpperCase()) ? parsed / 100 : parsed) : 0;
  };
  const items = (Array.isArray(cart.items) ? cart.items : []).map((item: any) => {
    const mods = item.modifiers ?? [];
    const unit = (item.menuItem?.price || 0) + mods.reduce((n: number, m: any) => n + (m.priceAdjustment || 0), 0);
    const detail = [mods.map((m: any) => str(m.name)).join(' · '), str(item.specialInstructions)].filter(Boolean).join(' — ');
    return { id: str(item.id), label: str(item.menuItem?.name) || 'Menu item', detail: detail || undefined, amount: d(unit), quantity: Math.max(1, Number(item.quantity) || 1) };
  });
  const fees = [
    cart.pickupDiscount ? { label: 'Pickup discount', amount: -d(cart.pickupDiscount) } : null,
    cart.deliveryFee ? { label: 'Delivery', amount: d(cart.deliveryFee) } : null,
    { label: 'Taxes', amount: d(cart.tax) },
    cart.tip ? { label: 'Tip', amount: d(cart.tip) } : null,
  ].filter(Boolean) as CartData['fees'];
  const issueCodes = getRestaurantCheckoutIssues(cart);
  const lockTarget = issueCodes.includes('empty_cart') ? { tab: 'cart', label: 'Review cart' }
    : issueCodes.includes('missing_contact') || issueCodes.includes('missing_delivery_address')
      ? { tab: 'details', label: `Complete ${orderType === 'delivery' ? 'delivery' : 'pickup'} details` }
      : { tab: 'fulfillment', label: 'Review fulfillment' };
  const direct = (storeInfo?.paymentProviders ?? []).filter((p: any) => ['stripe', 'paypal'].includes(p.provider) && p.publishableKey).map((p: any) => p.provider as PaymentChoice);
  const hasCash = (storeInfo?.paymentProviders ?? []).some((p: any) => ['cash', 'manual', 'pp_system_default'].includes(p.provider));
  const notes: string[] = [];
  if (orderType === 'delivery' && cart.deliveryMinimumNotMet) {
    notes.push(`Add ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(d(cart.deliveryMinimumShortfall))} more to reach the delivery minimum.`);
  }
  const zones = Array.isArray(storeInfo?.deliveryPostalCodes) ? storeInfo.deliveryPostalCodes.filter(Boolean) : [];
  if (orderType === 'delivery' && zones.length) notes.push(`Delivers to postal codes: ${zones.join(', ')}`);
  return {
    kind: 'restaurant', storeId, cartId, storeName: str(storeInfo?.name) || 'Restaurant', currency, items, fees,
    total: d(cart.total ?? cart.subtotal),
    issues: issueCodes.map(restaurantCheckoutIssueMessage), lockTarget,
    providers: [...direct, 'checkout'], countryCode: str(cart.deliveryCountryCode || storeInfo?.countryCode || 'us').toLowerCase(),
    restaurant: {
      orderType, deliveryEnabled: storeInfo?.deliveryEnabled === true, deliveryFee: configured(storeInfo?.deliveryFee),
      contact: clean({ customerName: cart.customerName, email: cart.email, customerPhone: cart.customerPhone }),
      delivery: clean({ deliveryAddress: cart.deliveryAddress, deliveryAddress2: cart.deliveryAddress2, deliveryCity: cart.deliveryCity, deliveryState: cart.deliveryState, deliveryZip: cart.deliveryZip, deliveryCountryCode: cart.deliveryCountryCode }),
      pickupAddress: str(storeInfo?.address) || undefined, estimatedPickup: str(storeInfo?.estimatedPickup) || undefined, notes,
      checkoutUrl: safeHttpUrl(`${storeUrl}/checkout?cart_id=${encodeURIComponent(cartId)}`),
      checkoutLabel: hasCash ? 'Cash or restaurant checkout' : `Checkout on ${str(storeInfo?.name) || 'restaurant'}`,
    },
  };
}

export type { CardPayload };
