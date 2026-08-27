/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import { beautifulUIStyles, iframeAutoResizeScript } from '../../ui/beautiful-ui';
import { getStoreLogoHue } from '@/lib/store-logo';
import {
  getRestaurantCheckoutIssues,
  restaurantCheckoutIssueMessage,
} from '@/lib/restaurant-checkout';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((amount || 0) / 100);
}

function formatConfiguredMoney(amount: unknown, currency: string): string {
  const parsed = Number.parseFloat(String(amount ?? '0'));
  const noDivision = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
  return formatMoney(noDivision.includes(currency.toUpperCase()) ? parsed : Math.round(parsed * 100), currency);
}

export function generateRestaurantCartUI(params: {
  storeId: string;
  cartId: string;
  cart: any;
  storeInfo: any;
  storeUrl: string;
}): string {
  const { storeId, cartId, cart, storeInfo, storeUrl } = params;
  const currency = cart.currencyCode || 'USD';
  const items = Array.isArray(cart.items) ? cart.items : [];
  const checkoutUrl = `${storeUrl}/checkout?cart_id=${encodeURIComponent(cartId)}`;
  const logoHue = getStoreLogoHue(storeInfo?.logoColor);
  const orderType = cart.orderType === 'delivery' ? 'delivery' : 'pickup';
  const deliveryEnabled = storeInfo?.deliveryEnabled === true;
  const hasContactDetails = Boolean(cart.customerName || cart.email || cart.customerPhone);
  const hasDeliveryDetails = Boolean(
    cart.deliveryAddress || cart.deliveryCity || cart.deliveryState ||
    cart.deliveryZip || cart.deliveryCountryCode
  );
  const hasOrderDetails = hasContactDetails || (orderType === 'delivery' && hasDeliveryDetails);
  const checkoutIssues = getRestaurantCheckoutIssues(cart);
  const directPaymentReady = checkoutIssues.length === 0;
  const paymentLockTarget = checkoutIssues.includes('empty_cart')
    ? { tab: 'cart', label: 'Review cart' }
    : checkoutIssues.includes('missing_contact') || checkoutIssues.includes('missing_delivery_address')
      ? { tab: 'details', label: `Complete ${orderType === 'delivery' ? 'delivery' : 'pickup'} details` }
      : { tab: 'fulfillment', label: 'Review fulfillment' };
  const directPaymentProviders = (storeInfo?.paymentProviders || []).filter(
    (provider: any) => ['stripe', 'paypal'].includes(provider.provider) && provider.publishableKey
  );
  const hasCash = (storeInfo?.paymentProviders || []).some(
    (provider: any) => ['cash', 'manual', 'pp_system_default'].includes(provider.provider)
  );
  const paymentIcon = (provider: string) => provider === 'stripe'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#635bff" d="M13.98 9.15c-2.18-.81-3.36-1.43-3.36-2.41 0-.83.68-1.3 1.9-1.3 2.23 0 4.52.85 6.09 1.63l.89-5.5C18.25.98 15.7 0 12.17 0 9.67 0 7.59.65 6.1 1.87 4.56 3.15 3.76 4.99 3.76 7.22c0 4.04 2.47 5.76 6.47 7.22 2.59.92 3.45 1.57 3.45 2.58 0 .98-.84 1.55-2.36 1.55-1.87 0-4.96-.92-6.99-2.11l-.9 5.55C5.18 22.99 8.39 24 11.71 24c2.64 0 4.85-.62 6.33-1.81 1.66-1.31 2.53-3.24 2.53-5.73 0-4.13-2.53-5.85-6.59-7.31Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#0070e0" d="M15.61 4.65H8.94L6.65 19.25H1.82L4.86 0h8c3.75 0 6.37 2.29 6.47 5.51-.65-.48-2.11-.86-3.72-.86Zm6.57 5.55c0 3.41-3.01 6.85-6.96 6.85h-2.49L11.6 24H6.74l1.85-11.54h3.59c4.21 0 7.35-3.63 7.15-6.95a5.24 5.24 0 0 1 2.85 4.69Z"/></svg>';

  const itemRows = items.map((item: any) => {
    const thumbnail = item.thumbnail || item.menuItem?.thumbnail;
    const thumbnailUrl = thumbnail?.startsWith('/') ? `${storeUrl}${thumbnail}` : thumbnail;
    const modifierTotal = (item.modifiers || []).reduce(
      (sum: number, modifier: any) => sum + (modifier.priceAdjustment || 0),
      0
    );
    const unitPrice = (item.menuItem?.price || 0) + modifierTotal;
    const itemTitle = item.menuItem?.name || 'Menu item';
    return `
      <div class="cart-item p-2 sm:p-4">
        <div class="flex gap-2 sm:gap-3 mb-1.5 sm:mb-3">
          ${thumbnailUrl
            ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(itemTitle)}" class="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border flex-shrink-0">`
            : '<div class="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded border flex items-center justify-center flex-shrink-0"><span class="text-xs text-gray-400">No image</span></div>'}
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-xs sm:text-sm">${escapeHtml(itemTitle)}</h4>
            ${(item.modifiers || []).length
              ? `<p class="text-xs text-gray-600 mt-0.5">${(item.modifiers || []).map((modifier: any) => escapeHtml(modifier.name)).join(' · ')}</p>`
              : ''}
            ${item.specialInstructions
              ? `<p class="text-xs text-gray-600 mt-0.5 italic">${escapeHtml(item.specialInstructions)}</p>`
              : ''}
            <p class="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">${escapeHtml(formatMoney(unitPrice, currency))} each</p>
          </div>
          <div class="text-right flex-shrink-0"><p class="font-semibold text-sm sm:text-base">${escapeHtml(formatMoney(unitPrice * (item.quantity || 1), currency))}</p></div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 sm:gap-2 border rounded">
            <button type="button" onclick='updateQuantity(${scriptJson(item.id)}, ${Math.max(1, (item.quantity || 1) - 1)})' class="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-100 text-sm ${(item.quantity || 1) <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${(item.quantity || 1) <= 1 ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
            <span class="px-1 sm:px-2 font-medium min-w-[1.5rem] sm:min-w-[2rem] text-center text-sm">${escapeHtml(item.quantity || 1)}</span>
            <button type="button" onclick='updateQuantity(${scriptJson(item.id)}, ${(item.quantity || 1) + 1})' class="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-100 text-sm" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" onclick='removeItem(${scriptJson(item.id)})' class="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium">Remove</button>
        </div>
      </div>`;
  }).join('') || '<div class="p-6 sm:p-8 text-center"><p class="text-gray-500">Your restaurant cart is empty</p></div>';

  const paymentRows = directPaymentProviders.map((provider: any) => `
    <button type="button" onclick='selectPaymentProvider(${scriptJson(provider.provider)})' class="payment-method-btn w-full border rounded-md p-4 text-left transition-colors bg-white" data-provider="${escapeHtml(provider.provider)}" aria-pressed="false" ${directPaymentReady ? '' : 'disabled tabindex="-1"'}>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="choice-radio w-4 h-4 border-2 rounded-full flex items-center justify-center"><div class="payment-radio w-0 h-0 rounded-full transition-all"></div></div>
          <span class="font-medium capitalize">${escapeHtml(provider.provider)}</span>
        </div>
        <span class="provider-icon">${paymentIcon(provider.provider)}</span>
      </div>
    </button>`).join('');
  const checkoutPaymentRow = `
    <button type="button" onclick="selectPaymentProvider('checkout')" class="payment-method-btn w-full border rounded-md p-4 text-left transition-colors bg-white" data-provider="checkout" aria-pressed="false" ${directPaymentReady ? '' : 'disabled tabindex="-1"'}>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="choice-radio w-4 h-4 border-2 rounded-full flex items-center justify-center"><div class="payment-radio w-0 h-0 rounded-full transition-all"></div></div>
          <span class="font-medium">${hasCash ? 'Cash or restaurant checkout' : `Checkout on ${escapeHtml(storeInfo?.name || 'restaurant')}`}</span>
        </div>
        ${storeInfo?.logoIcon ? `<span class="checkout-logo" style="filter:hue-rotate(${logoHue}deg)">${storeInfo.logoIcon}</span>` : ''}
      </div>
    </button>`;

  const issueList = checkoutIssues.map((issue) => `<li>${escapeHtml(restaurantCheckoutIssueMessage(issue))}</li>`).join('');
  const deliveryZones = Array.isArray(storeInfo?.deliveryPostalCodes)
    ? storeInfo.deliveryPostalCodes.filter(Boolean)
    : [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${beautifulUIStyles}
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--surface); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    button, a, input, textarea { font: inherit; }
    button { transition: all 0.2s; }
    button:hover:not(:disabled) { transform: translateY(-1px); }
    button:disabled { cursor: not-allowed; opacity: .5; }
    .tab-button { position: relative; }
    body > div > .cart-shell { overflow: hidden; border-radius: 12px !important; border-color: var(--line) !important; box-shadow: var(--shadow-card) !important; }
    .cart-shell .rounded { border-radius: 8px !important; }
    .cart-shell .rounded-md { border-radius: 8px !important; }
    .cart-shell .rounded-lg { border-radius: 10px !important; }
    .cart-shell .cart-header,
    .cart-shell .cart-tabs,
    .cart-shell .border,
    .cart-shell .border-b,
    .cart-shell .border-t,
    .cart-shell .divide-y > :not([hidden]) ~ :not([hidden]) { border-color: var(--line) !important; }
    .cart-store-logo { overflow: hidden; background: var(--surface); }
    .cart-store-logo > svg { display: block; width: 100%; height: 100%; }
    .choice-button, .payment-method-btn { border-color: var(--line-strong) !important; border-radius: 8px !important; box-shadow: var(--shadow-hairline) !important; }
    .choice-radio { border-color: var(--line-strong) !important; background: transparent !important; }
    .is-selected .choice-radio { border-color: var(--signal) !important; }
    .is-selected .payment-radio, .is-selected .choice-radio-dot { width: 8px !important; height: 8px !important; background: var(--signal) !important; }
    .tab-button.active::after { content: ''; position: absolute; bottom: -1px; left: 12px; right: 12px; height: 1px; background: var(--signal); z-index: 1; }
    .tab-content.hidden { display: none; }
    .status-note { border: 1px solid var(--line); border-radius: 8px; background: var(--inset); padding: 10px 12px; color: var(--ink-2); font-size: 11px; line-height: 1.45; }
    .status-note ul { margin: 6px 0 0; padding-left: 16px; }
    .provider-icon, .provider-icon svg { display: block; width: 20px; height: 20px; }
    .payment-action.hidden { display: none; }
    .checkout-logo { width: 20px; height: 20px; overflow: hidden; }
    .checkout-logo > svg { display: block; width: 100%; height: 100%; }
    .payment-lock-stage { position: relative; min-height: 390px; overflow: hidden; border: 1px solid var(--line); border-radius: 10px; background: var(--inset); }
    .payment-lock-preview { min-height: 390px; padding: 204px 12px 12px; opacity: .42; filter: saturate(.35); pointer-events: none; user-select: none; }
    .payment-lock-card { position: absolute; z-index: 2; top: 12px; left: 50%; width: min(420px, calc(100% - 24px)); transform: translateX(-50%); border: 1px solid var(--line-strong); border-radius: 10px; background: var(--surface); box-shadow: var(--shadow-raised); padding: 16px; }
    .payment-lock-icon { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 auto; border: 1px solid var(--line); border-radius: 8px; background: var(--inset); color: var(--ink-2); }
    .payment-lock-icon svg { width: 15px; height: 15px; }
    .payment-lock-card h4 { margin: 0; font-size: 14px; line-height: 1.3; }
    .payment-lock-card p { margin: 3px 0 0; color: var(--ink-2); font-size: 12px; }
    .payment-lock-card ul { margin: 12px 0 14px; padding: 0; list-style: none; display: grid; gap: 6px; }
    .payment-lock-card li { display: flex; align-items: center; gap: 8px; color: var(--ink-2); font-size: 12px; }
    .payment-lock-card li::before { content: ''; width: 5px; height: 5px; flex: 0 0 auto; border-radius: 999px; background: var(--ink-3); }
    .payment-lock-card button { white-space: nowrap; }
    @media (max-width: 374px) { .payment-lock-card { padding: 14px; } .payment-lock-preview { padding: 8px; } }
  </style>
</head>
<body>
  <div class="max-w-4xl mx-auto">
    <div class="cart-shell bg-gray-50 border" data-order-type="${escapeHtml(orderType)}">
      <div class="cart-header border-b p-3 sm:p-6">
        <p class="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Your cart from</p>
        <div class="flex items-center gap-2 sm:gap-3">
          ${storeInfo?.logoIcon ? `<div class="cart-store-logo flex w-6 h-6 sm:w-7 sm:h-7 items-center justify-center" style="filter: hue-rotate(${logoHue}deg)">${storeInfo.logoIcon}</div>` : ''}
          <h2 class="text-xl sm:text-2xl font-bold">${escapeHtml(storeInfo?.name || 'Restaurant checkout')}</h2>
        </div>
      </div>

      <div class="cart-tabs border-b border-gray-200">
        <div class="flex">
          <button type="button" onclick="switchTab('cart')" id="tab-cart" class="tab-button active flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">Cart</button>
          <button type="button" onclick="switchTab('fulfillment')" id="tab-fulfillment" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">Fulfillment</button>
          <button type="button" onclick="switchTab('details')" id="tab-details" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">Details</button>
          <button type="button" onclick="switchTab('payment')" id="tab-payment" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">Payment</button>
        </div>
      </div>

      <div class="p-3 sm:p-6">
        <div id="content-cart" class="tab-content">
          <div class="mb-2 sm:mb-4">
            <h3 class="font-semibold text-base sm:text-lg">Restaurant Cart</h3>
            <p class="text-xs sm:text-sm text-gray-600" style="opacity:.6">${escapeHtml(items.length)} ${items.length === 1 ? 'item' : 'items'} · ${escapeHtml(orderType)}</p>
          </div>
          <div class="divide-y mb-6 bg-white rounded-lg border">${itemRows}</div>
          ${items.length ? `<div class="pt-4 space-y-2">
            <div class="flex justify-between text-sm"><span class="text-gray-600">Subtotal</span><span class="font-medium">${escapeHtml(formatMoney(cart.subtotal || 0, currency))}</span></div>
            ${cart.pickupDiscount ? `<div class="flex justify-between text-sm"><span class="text-gray-600">Pickup discount</span><span class="font-medium">−${escapeHtml(formatMoney(cart.pickupDiscount, currency))}</span></div>` : ''}
            ${cart.deliveryFee ? `<div class="flex justify-between text-sm"><span class="text-gray-600">Delivery</span><span class="font-medium">${escapeHtml(formatMoney(cart.deliveryFee, currency))}</span></div>` : ''}
            <div class="flex justify-between text-sm"><span class="text-gray-600">Taxes</span><span class="font-medium">${escapeHtml(formatMoney(cart.tax || 0, currency))}</span></div>
            ${cart.tip ? `<div class="flex justify-between text-sm"><span class="text-gray-600">Tip</span><span class="font-medium">${escapeHtml(formatMoney(cart.tip, currency))}</span></div>` : ''}
            <div class="border-t pt-2 flex justify-between"><span class="font-semibold text-lg">Total</span><span class="font-bold text-lg">${escapeHtml(formatMoney(cart.total ?? cart.subtotal ?? 0, currency))}</span></div>
          </div>` : ''}
        </div>

        <div id="content-fulfillment" class="tab-content hidden">
          <h3 class="font-semibold text-base sm:text-lg mb-2">Fulfillment</h3>
          <p class="text-sm text-gray-600 mb-4">Choose how you want to receive this order.</p>
          <div class="space-y-2">
            <button type="button" onclick="selectFulfillment('pickup')" class="choice-button ${orderType === 'pickup' ? 'is-selected' : ''} w-full border rounded-md p-4 text-left transition-colors bg-white">
              <div class="flex justify-between items-center gap-4">
                <div class="flex items-center gap-4"><div class="choice-radio ${orderType === 'pickup' ? 'is-selected' : ''} w-4 h-4 border-2 rounded-full flex items-center justify-center">${orderType === 'pickup' ? '<div class="choice-radio-dot rounded-full"></div>' : ''}</div><div><span class="block font-medium">Pickup</span><span class="block mt-1 text-xs text-gray-600">${escapeHtml(storeInfo?.estimatedPickup ? `Ready in ${storeInfo.estimatedPickup}` : 'Collect from the restaurant')}${storeInfo?.pickupDiscount ? ` · ${escapeHtml(storeInfo.pickupDiscount)}% off` : ''}</span></div></div>
                <span class="font-semibold">Free</span>
              </div>
            </button>
            ${deliveryEnabled ? `<button type="button" onclick="selectFulfillment('delivery')" class="choice-button ${orderType === 'delivery' ? 'is-selected' : ''} w-full border rounded-md p-4 text-left transition-colors bg-white">
              <div class="flex justify-between items-center gap-4">
                <div class="flex items-center gap-4"><div class="choice-radio ${orderType === 'delivery' ? 'is-selected' : ''} w-4 h-4 border-2 rounded-full flex items-center justify-center">${orderType === 'delivery' ? '<div class="choice-radio-dot rounded-full"></div>' : ''}</div><div><span class="block font-medium">Delivery</span><span class="block mt-1 text-xs text-gray-600">${escapeHtml(storeInfo?.estimatedDelivery || 'Restaurant delivery')}${storeInfo?.deliveryMinimum != null ? ` · ${escapeHtml(formatConfiguredMoney(storeInfo.deliveryMinimum, currency))} minimum` : ''}</span></div></div>
                <span class="font-semibold">${escapeHtml(formatConfiguredMoney(storeInfo?.deliveryFee || 0, currency))}</span>
              </div>
            </button>` : '<div class="status-note">This restaurant is currently pickup only.</div>'}
          </div>
          ${orderType === 'pickup' && storeInfo?.address ? `<div class="status-note mt-4"><strong>Pickup location</strong><br>${escapeHtml(storeInfo.address)}${storeInfo?.estimatedPickup ? `<br>Ready in ${escapeHtml(storeInfo.estimatedPickup)}` : ''}</div>` : ''}
          ${orderType === 'delivery' && deliveryZones.length ? `<div class="status-note mt-4">Delivery is available in the restaurant’s configured area: ${escapeHtml(deliveryZones.join(', '))}.</div>` : ''}
          ${orderType === 'delivery' && cart.deliveryMinimumNotMet ? `<div class="status-note mt-4">Add ${escapeHtml(formatMoney(cart.deliveryMinimumShortfall || 0, currency))} more to reach the ${escapeHtml(formatMoney(cart.deliveryMinimum || 0, currency))} delivery minimum, or switch to pickup.</div>` : ''}
        </div>

        <div id="content-details" class="tab-content hidden">
          <h3 class="font-semibold text-base sm:text-lg mb-2">${orderType === 'delivery' ? 'Delivery Details' : 'Pickup Details'}</h3>
          ${hasOrderDetails ? `<div class="bg-gray-50 p-4 rounded-md mb-4">
            ${cart.customerName ? `<p class="font-medium">${escapeHtml(cart.customerName)}</p>` : ''}
            ${cart.email ? `<p class="text-sm text-gray-600">${escapeHtml(cart.email)}</p>` : ''}
            ${cart.customerPhone ? `<p class="text-sm text-gray-600">${escapeHtml(cart.customerPhone)}</p>` : ''}
            ${orderType === 'delivery' && hasDeliveryDetails ? `<div class="mt-3 pt-3 border-t">
              ${cart.deliveryAddress ? `<p class="text-sm text-gray-600">${escapeHtml(cart.deliveryAddress)}${cart.deliveryAddress2 ? `, ${escapeHtml(cart.deliveryAddress2)}` : ''}</p>` : ''}
              <p class="text-sm text-gray-600">${escapeHtml([cart.deliveryCity, cart.deliveryState, cart.deliveryZip].filter(Boolean).join(', '))}</p>
              ${cart.deliveryCountryCode ? `<p class="text-sm text-gray-600">${escapeHtml(cart.deliveryCountryCode)}</p>` : ''}
            </div>` : ''}
          </div>` : `<p class="text-sm text-gray-500 mb-3">Paste your ${orderType === 'delivery' ? 'delivery address, ' : ''}name, email, and phone number below in any format. The AI will figure out the country and structure.</p>`}
          <textarea
            id="restaurant-details-input"
            placeholder="${orderType === 'delivery'
              ? 'Example:&#10;John Doe&#10;john@email.com&#10;123 Main St&#10;Brooklyn, NY 11201&#10;USA&#10;+1 (555) 123-4567'
              : 'Example:&#10;John Doe&#10;john@email.com&#10;+1 (555) 123-4567'}"
            class="w-full border border-gray-300 rounded-md p-3 text-base mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
            rows="6"></textarea>
          <button type="button" onclick="requestRestaurantDetailsFromAI()" class="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800">
            ${hasOrderDetails ? `Change ${orderType === 'delivery' ? 'Delivery' : 'Pickup'} Details` : `Add ${orderType === 'delivery' ? 'Delivery' : 'Pickup'} Details`}
          </button>
          ${orderType === 'pickup' && storeInfo?.address ? `<div class="status-note mt-4"><strong>Pickup location</strong><br>${escapeHtml(storeInfo.address)}${storeInfo?.estimatedPickup ? `<br>Ready in ${escapeHtml(storeInfo.estimatedPickup)}` : ''}</div>` : ''}
        </div>

        <div id="content-payment" class="tab-content hidden">
          <h3 class="font-semibold text-lg mb-4">Payment Method</h3>
          ${directPaymentReady ? `<div id="payment-selection"><p class="text-sm text-gray-600 mb-4">Select your payment method</p><div class="space-y-2">${paymentRows}${checkoutPaymentRow}</div></div>
          <div id="payment-action" class="payment-action hidden mt-6">
            ${directPaymentProviders.map((provider: any) => `<div id="${escapeHtml(provider.provider)}-action" class="payment-provider-action hidden"><p class="text-sm text-gray-600 mb-4">Complete your payment with ${escapeHtml(provider.provider)}.</p><button type="button" onclick="beginPayment(${scriptJson(provider.provider)})" class="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 font-medium">Pay with ${escapeHtml(provider.provider)}</button></div>`).join('')}
            <div id="checkout-action" class="payment-provider-action hidden"><p class="text-sm text-gray-600 mb-4">Continue on the source checkout for cash, manual payment, or restaurant-managed checkout.</p><a href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noopener noreferrer" class="block w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 font-medium text-center">Go to ${escapeHtml(storeInfo?.name || 'Restaurant')}</a></div>
          </div>` : `<div class="payment-lock-stage" data-lock-target="${escapeHtml(paymentLockTarget.tab)}">
            <div class="payment-lock-preview" aria-hidden="true"><p class="text-sm text-gray-600 mb-3">Available payment methods</p><div class="space-y-2">${paymentRows || '<div class="payment-method-btn border p-4 bg-white"><span class="font-medium">Secure payment</span></div>'}${checkoutPaymentRow}</div></div>
            <div class="payment-lock-card" role="status" aria-labelledby="payment-lock-title">
              <div class="flex items-start gap-3"><span class="payment-lock-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><div><h4 id="payment-lock-title">Complete checkout details to pay</h4><p>Your available payment methods are ready once these steps are complete.</p></div></div>
              <ul>${issueList}</ul>
              <button type="button" onclick="switchTab('${escapeHtml(paymentLockTarget.tab)}')" class="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md hover:bg-gray-800">${escapeHtml(paymentLockTarget.label)}</button>
            </div>
          </div>`}
        </div>
      </div>
    </div>
  </div>

  <script>
    ${iframeAutoResizeScript}
    const storeId = ${scriptJson(storeId)};
    const cartId = ${scriptJson(cartId)};
    const restaurantName = ${scriptJson(storeInfo?.name || 'the restaurant')};
    let currentOrderType = ${scriptJson(orderType)};

    function sendTool(toolName, params, onResponse) {
      const messageId = 'restaurant-cart-' + Date.now();
      if (onResponse) {
        const handleResponse = function (event) {
          if (event.data.messageId !== messageId || event.data.type !== 'ui-message-response') return;
          window.removeEventListener('message', handleResponse);
          onResponse(event.data.payload && event.data.payload.response);
        };
        window.addEventListener('message', handleResponse);
      }
      window.parent.postMessage({ type: 'tool', messageId, payload: { toolName, params } }, '*');
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-button').forEach(function (tab) { tab.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (content) { content.classList.add('hidden'); });
      document.getElementById('tab-' + tabName).classList.add('active');
      document.getElementById('content-' + tabName).classList.remove('hidden');
    }

    function responseSucceeded(response) {
      try {
        const text = response && response.content && response.content[0] && response.content[0].text;
        return Boolean(text && !JSON.parse(text).error);
      } catch { return false; }
    }

    function refreshCart() {
      const activeTab = document.querySelector('.tab-button.active');
      const activeTabName = activeTab ? activeTab.id.replace('tab-', '') : 'cart';
      sendTool('viewCart', { storeId, cartId }, function (response) {
        try {
          const content = response && response.content && response.content[0];
          const html = content && content.resource && content.resource.text;
          if (!html) return;
          const nextDocument = new DOMParser().parseFromString(html, 'text/html');
          const currentShell = document.querySelector('.cart-shell');
          const nextShell = nextDocument.querySelector('.cart-shell');
          if (!currentShell || !nextShell) return;
          currentShell.innerHTML = nextShell.innerHTML;
          currentOrderType = nextShell.dataset.orderType === 'delivery' ? 'delivery' : 'pickup';
          switchTab(activeTabName);
        } catch (error) { console.error('[Restaurant cart] Could not refresh cart', error); }
      });
    }

    function updateQuantity(lineItemId, quantity) {
      sendTool('updateCartItem', { storeId, cartId, lineItemId, quantity }, function (response) {
        if (responseSucceeded(response)) refreshCart();
      });
    }

    function removeItem(lineItemId) {
      sendTool('removeCartItem', { storeId, cartId, lineItemId }, function (response) {
        if (responseSucceeded(response)) refreshCart();
      });
    }

    function selectFulfillment(nextOrderType) {
      sendTool('setRestaurantFulfillment', { storeId, cartId, orderType: nextOrderType }, function (response) {
        if (responseSucceeded(response)) refreshCart();
      });
    }

    function requestRestaurantDetailsFromAI() {
      const detailsInput = document.getElementById('restaurant-details-input');
      const detailsText = detailsInput ? detailsInput.value.trim() : '';
      if (!detailsText) {
        alert('Please paste your ' + (currentOrderType === 'delivery' ? 'delivery address, ' : '') + 'name, email, and phone number in the text area above.');
        return;
      }

      const deliveryInstruction = currentOrderType === 'delivery'
        ? ' Include deliveryAddress, deliveryAddress2 when present, deliveryCity, deliveryState when present, deliveryZip, and a two-letter deliveryCountryCode.'
        : '';
      const prompt = 'Please set these ' + currentOrderType + ' order details for ' + restaurantName +
        ' (storeId: ' + storeId + ', cartId: ' + cartId + '). Keep orderType as ' + currentOrderType +
        '. Parse the following real customer information into customerName, email, and customerPhone.' +
        deliveryInstruction + ' Use setRestaurantFulfillment exactly once. Do not invent missing values; ask me for anything required that is missing: ' + detailsText;

      window.parent.postMessage({ type: 'prompt', payload: { prompt } }, '*');
    }

    function selectPaymentProvider(provider) {
      document.querySelectorAll('.payment-method-btn').forEach(function (button) {
        const selected = button.dataset.provider === provider;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      document.getElementById('payment-action').classList.remove('hidden');
      document.querySelectorAll('.payment-provider-action').forEach(function (action) { action.classList.add('hidden'); });
      const action = document.getElementById(provider + '-action');
      if (action) action.classList.remove('hidden');
    }

    function beginPayment(paymentProvider) {
      sendTool('initiatePaymentSession', { storeId, cartId, paymentProvider });
    }

    window.switchTab = switchTab;
    window.updateQuantity = updateQuantity;
    window.removeItem = removeItem;
    window.selectFulfillment = selectFulfillment;
    window.requestRestaurantDetailsFromAI = requestRestaurantDetailsFromAI;
    window.selectPaymentProvider = selectPaymentProvider;
    window.beginPayment = beginPayment;
  </script>
</body>
</html>`;
}
