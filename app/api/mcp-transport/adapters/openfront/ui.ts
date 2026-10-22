/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import { beautifulUIStyles, iframeAutoResizeScript } from '../../ui/beautiful-ui';
import { getStoreLogoHue } from '@/lib/store-logo';
import { escapeHtml, safeHttpUrl, scriptJson } from '@/lib/safe-content';

/**
 * OpenFront UI Generators
 *
 * These functions generate HTML UI for OpenFront/Openship carts.
 * IMPORTANT: This is a direct extraction from cart-tools.ts - DO NOT modify the UI.
 */

/**
 * Generate the cart view UI for OpenFront
 * Extracted from cart-tools.ts viewCart tool (lines 657-1199)
 */
export function generateOpenFrontCartUI(params: {
  storeId: string;
  cartId: string;
  cart: any;
  storeInfo: any;
  shippingOptions: any[];
}): string {
  const { storeId, cartId, cart, storeInfo, shippingOptions } = params;
  const storeLogoHue = getStoreLogoHue(storeInfo?.logoColor);

  // Format currency helper - handles both formatted strings and numbers
  const formatPrice = (amount: string | number | undefined, currencyCode: string = 'USD') => {
    if (amount === undefined || amount === null || amount === '') return 'Price unavailable';
    // Preserve source-formatted totals and the existing Openfront minor-unit contract.
    if (typeof amount === 'string') return amount;
    if (!Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currencyCode)) return 'Price unavailable';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount / 100);
  };

  const currencyCode = cart.region?.currencyCode || cart.region?.currency?.code || 'USD';

  // Generate HTML for cart items
  const cartItemsHTML = cart.lineItems?.map((item: any) => {
    const thumbnail = item.thumbnail || item.productVariant?.product?.thumbnail;
    // Prepend store URL if thumbnail is a relative path (starts with /)
    const thumbnailUrl = safeHttpUrl(thumbnail, typeof storeInfo?.url === 'string' ? storeInfo.url : undefined);
    const productTitle = item.title || item.productVariant?.product?.title;
    const variantTitle = item.productVariant?.title;
    const quantity = Number.isSafeInteger(item.quantity) ? Math.max(1, Math.min(99, item.quantity)) : 1;
    const unitPrice = formatPrice(item.unitPrice, currencyCode);
    const total = formatPrice(item.total, currencyCode);

    return `
      <div class="cart-item p-2 sm:p-4">
        <div class="flex gap-2 sm:gap-3 mb-1.5 sm:mb-3">
          ${thumbnailUrl ? `
            <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(productTitle)}"
                 class="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border flex-shrink-0">
          ` : `
            <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded border flex items-center justify-center flex-shrink-0">
              <span class="text-xs text-gray-400">No image</span>
            </div>
          `}

          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-xs sm:text-sm">${escapeHtml(productTitle)}</h4>
            ${variantTitle ? `<p class="text-xs text-gray-600 mt-0.5">${escapeHtml(variantTitle)}</p>` : ''}
            <p class="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">${escapeHtml(unitPrice)} each</p>
          </div>

          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-sm sm:text-base">${escapeHtml(total)}</p>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 sm:gap-2 border rounded">
            <button
              onclick="updateQuantity(${escapeHtml(scriptJson(item.id))}, ${quantity - 1})"
              class="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-100 text-sm ${quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
              ${quantity <= 1 ? 'disabled' : ''}>
              −
            </button>
            <span class="px-1 sm:px-2 font-medium min-w-[1.5rem] sm:min-w-[2rem] text-center text-sm">${quantity}</span>
            <button
              onclick="updateQuantity(${escapeHtml(scriptJson(item.id))}, ${quantity + 1})"
              class="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-100 text-sm">
              +
            </button>
          </div>

          <button
            onclick="removeItem(${escapeHtml(scriptJson(item.id))})"
            class="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('') || `<div class="p-6 sm:p-8 text-center">
    <p class="text-gray-500 mb-4">Your cart is empty</p>
    <button
      onclick='window.parent.postMessage({ type: "tool", payload: { toolName: "discoverProducts", params: { storeIds: [${escapeHtml(scriptJson(storeId))}] } } }, "*")'
      class="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
      Show Products
    </button>
  </div>`;

  // Cart summary - use cart.tax and cart.shipping (not taxTotal/shippingTotal)
  const subtotal = formatPrice(cart.subtotal, currencyCode);
  const shippingTotal = cart.shipping || null;
  const taxTotal = cart.tax || null;
  const discountTotal = cart.discount || null;
  const total = formatPrice(cart.total, currencyCode);
  const checkoutIssues = [
    ...(!cart.lineItems?.length ? ['Add at least one item to the cart'] : []),
    ...(!cart.shippingAddress ? ['Add a shipping address'] : []),
    ...(!cart.shippingMethods?.length ? ['Select a shipping method'] : []),
  ];
  const paymentReady = checkoutIssues.length === 0;
  const paymentLockTarget = !cart.lineItems?.length
    ? { tab: 'cart', label: 'Review cart' }
    : !cart.shippingAddress
      ? { tab: 'address', label: 'Add shipping address' }
      : { tab: 'shipping', label: 'Choose shipping method' };
  const paymentIssueList = checkoutIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('');
  const paymentProviderRows = (storeInfo?.paymentProviders || []).map((provider: any) => `
    <button
      onclick='selectPaymentProvider(${escapeHtml(scriptJson(provider.provider))})'
      class="payment-method-btn w-full border rounded-md p-4 text-left transition-colors bg-white"
      data-provider="${escapeHtml(provider.provider)}"
      aria-pressed="false"
      ${paymentReady ? '' : 'disabled tabindex="-1"'}>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="choice-radio w-4 h-4 border-2 rounded-full flex items-center justify-center"><div class="payment-radio w-0 h-0 rounded-full transition-all"></div></div>
          <span class="font-medium capitalize">${escapeHtml(provider.provider)}</span>
        </div>
        <div class="flex items-center justify-center">
          ${provider.provider === 'stripe' ? '<svg class="h-5 w-5" viewBox="0 0 24 24"><path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>' : ''}
          ${provider.provider === 'paypal' ? '<svg class="h-5 w-5" role="img" viewBox="0 0 24 24" style="color: var(--signal-ink)" xmlns="http://www.w3.org/2000/svg"><title>PayPal</title><path fill="currentColor" d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"/></svg>' : ''}
        </div>
      </div>
    </button>`).join('');
  const checkoutPaymentRow = `
    <button onclick="selectPaymentProvider('checkout')" class="payment-method-btn w-full border rounded-md p-4 text-left transition-colors bg-white" data-provider="checkout" aria-pressed="false" ${paymentReady ? '' : 'disabled tabindex="-1"'}>
      <div class="flex justify-between items-center"><div class="flex items-center gap-4"><div class="choice-radio w-4 h-4 border-2 rounded-full flex items-center justify-center"><div class="payment-radio w-0 h-0 rounded-full transition-all"></div></div><span class="font-medium">Checkout on ${escapeHtml(storeInfo?.name || 'Store')}</span></div><div class="cart-store-logo flex w-5 h-5 items-center justify-center" style="filter: hue-rotate(${storeLogoHue}deg);" aria-hidden="true"><span class="text-xs font-semibold">S</span></div></div>
    </button>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        ${beautifulUIStyles}
        body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        button { transition: all 0.2s; }
        button:hover:not(:disabled) { transform: translateY(-1px); }
        .tab-button { position: relative; }
        body > div > .cart-shell {
          overflow: hidden;
          border-radius: 12px !important;
          border-color: var(--line) !important;
          box-shadow: var(--shadow-card) !important;
        }
        .cart-shell .rounded { border-radius: 8px !important; }
        .cart-shell .rounded-md { border-radius: 8px !important; }
        .cart-shell .rounded-lg { border-radius: 10px !important; }
        .cart-shell .cart-header,
        .cart-shell .cart-tabs,
        .cart-shell .border,
        .cart-shell .border-b,
        .cart-shell .border-t,
        .cart-shell .divide-y > :not([hidden]) ~ :not([hidden]) {
          border-color: var(--line) !important;
        }
        .cart-shell .payment-method-btn {
          border-radius: 8px !important;
          border-color: var(--line-strong) !important;
          box-shadow: var(--shadow-hairline) !important;
        }
        .cart-shell .cart-store-logo {
          overflow: hidden;
          background: var(--surface);
        }
        .cart-shell .cart-store-logo > svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .cart-shell .choice-radio {
          border-color: var(--line-strong) !important;
          background: transparent !important;
        }
        .cart-shell .is-selected .choice-radio,
        .cart-shell .choice-radio.is-selected {
          border-color: var(--signal) !important;
        }
        .cart-shell .is-selected .payment-radio,
        .cart-shell .choice-radio.is-selected .choice-radio-dot {
          width: 8px !important;
          height: 8px !important;
          background: var(--signal) !important;
        }
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 12px;
          right: 12px;
          height: 1px;
          background: var(--signal) !important;
          z-index: 1;
        }
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
        <div class="cart-shell bg-gray-50 border">
          <!-- Store Logo & Header -->
          <div class="cart-header border-b p-3 sm:p-6">
            <p class="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Your cart from</p>
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="cart-store-logo flex w-6 h-6 sm:w-7 sm:h-7 items-center justify-center" style="filter: hue-rotate(${storeLogoHue}deg);" aria-hidden="true"><span class="text-sm font-semibold">S</span></div>
              <h2 class="text-xl sm:text-2xl font-bold">${escapeHtml(storeInfo?.name || 'Checkout')}</h2>
            </div>
          </div>

          <!-- Tabs -->
          <div class="cart-tabs border-b border-gray-200">
            <div class="flex">
              <button onclick="switchTab('cart')" id="tab-cart" class="tab-button active flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">
                Cart
              </button>
              <button onclick="switchTab('address')" id="tab-address" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">
                Address
              </button>
              <button onclick="switchTab('shipping')" id="tab-shipping" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">
                Shipping
              </button>
              <button onclick="switchTab('payment')" id="tab-payment" class="tab-button flex-1 px-2 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm font-medium hover:text-gray-600">
                Payment
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div class="p-3 sm:p-6">
            <!-- Cart Tab -->
            <div id="content-cart" class="tab-content">
              <div class="mb-2 sm:mb-4">
                <h3 class="font-semibold text-base sm:text-lg">Shopping Cart</h3>
                <p class="text-xs sm:text-sm text-gray-600" style="opacity: 0.6;">${cart.lineItems?.length || 0} items</p>
              </div>
              <div class="divide-y mb-6 bg-white rounded-lg border">
                ${cartItemsHTML}
              </div>
              ${cart.lineItems?.length > 0 ? `
                <div class="pt-4 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Subtotal</span>
                    <span class="font-medium">${escapeHtml(subtotal)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Shipping</span>
                    <span class="font-medium">${escapeHtml(shippingTotal || '$0.00')}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Taxes</span>
                    <span class="font-medium">${escapeHtml(taxTotal || '$0.00')}</span>
                  </div>
                  <div class="border-t pt-2 flex justify-between">
                    <span class="font-semibold text-lg">Total</span>
                    <span class="font-bold text-lg">${escapeHtml(total)}</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Address Tab -->
            <div id="content-address" class="tab-content hidden">
              <h3 class="font-semibold text-base sm:text-lg mb-2">Shipping Address</h3>
              <p class="text-sm text-gray-500 mb-3">Enter your details directly. They are sent only to this source cart, not to the assistant model.</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="text-xs text-gray-600">Email<input id="address-email" type="email" maxlength="320" required value="${escapeHtml(cart.email || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="email"></label>
                <label class="text-xs text-gray-600">First name<input id="address-first-name" maxlength="80" required value="${escapeHtml(cart.shippingAddress?.firstName || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="given-name"></label>
                <label class="text-xs text-gray-600">Last name<input id="address-last-name" maxlength="80" required value="${escapeHtml(cart.shippingAddress?.lastName || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="family-name"></label>
                <label class="text-xs text-gray-600 sm:col-span-2">Address<input id="address-line1" maxlength="240" required value="${escapeHtml(cart.shippingAddress?.address1 || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="address-line1"></label>
                <label class="text-xs text-gray-600">City<input id="address-city" maxlength="120" required value="${escapeHtml(cart.shippingAddress?.city || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="address-level2"></label>
                <label class="text-xs text-gray-600">State or province<input id="address-province" maxlength="120" value="${escapeHtml(cart.shippingAddress?.province || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="address-level1"></label>
                <label class="text-xs text-gray-600">Postal code<input id="address-postal-code" maxlength="32" required value="${escapeHtml(cart.shippingAddress?.postalCode || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="postal-code"></label>
                <label class="text-xs text-gray-600">Country code<input id="address-country-code" maxlength="2" pattern="[A-Za-z]{2}" required value="${escapeHtml(cart.shippingAddress?.country?.iso2 || 'us')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="country"></label>
                <label class="text-xs text-gray-600">Phone<input id="address-phone" type="tel" maxlength="64" required value="${escapeHtml(cart.shippingAddress?.phone || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="tel"></label>
                <label class="text-xs text-gray-600">Company (optional)<input id="address-company" maxlength="160" value="${escapeHtml(cart.shippingAddress?.company || '')}" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="organization"></label>
              </div>
              <button onclick="saveAddressDetails()" class="w-full mt-3 bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800">
                ${cart.shippingAddress ? 'Change Address and Email' : 'Add Address and Email'}
              </button>
            </div>

            <!-- Shipping Tab -->
            <div id="content-shipping" class="tab-content hidden">
              <h3 class="font-semibold text-base sm:text-lg mb-2 sm:mb-4">Shipping Method</h3>
              ${shippingOptions.length > 0 ? `
                <p class="text-sm text-gray-600 mb-4">Select your preferred shipping method</p>
                <div class="space-y-2">
                  ${shippingOptions.map((option: any) => {
                    const isSelected = cart.shippingMethods?.some((m: any) => m.shippingOption?.id === option.id);
                    return `
                    <button
                      onclick='selectShippingMethod(${escapeHtml(scriptJson(option.id))}, ${escapeHtml(scriptJson(option.name))})'
                      class="shipping-method-btn ${isSelected ? 'is-selected' : ''} w-full border rounded-md p-4 text-left transition-colors bg-white">
                      <div class="flex justify-between items-center">
                        <div class="flex items-center gap-4">
                          <div class="choice-radio ${isSelected ? 'is-selected' : ''} w-4 h-4 border-2 rounded-full flex items-center justify-center">
                            ${isSelected ? '<div class="choice-radio-dot rounded-full"></div>' : ''}
                          </div>
                          <span class="font-medium">${escapeHtml(option.name)}</span>
                        </div>
                        <span class="font-semibold">${escapeHtml(option.calculatedAmount || formatPrice(option.amount || 0, currencyCode))}</span>
                      </div>
                    </button>
                  `;
                  }).join('')}
                </div>
              ` : `
                <p class="text-sm text-gray-500 mb-4">No shipping methods available. Please set a shipping address first.</p>
                <button onclick="switchTab('address')" class="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800">
                  Add Address
                </button>
              `}
            </div>

            <!-- Payment Tab -->
            <div id="content-payment" class="tab-content hidden">
              <h3 class="font-semibold text-lg mb-4">Payment Method</h3>

              ${paymentReady ? `<!-- Step 1: Payment Method Selection -->
              <div id="payment-selection"><p class="text-sm text-gray-600 mb-4">Select your payment method</p><div class="space-y-2">${paymentProviderRows}${checkoutPaymentRow}</div></div>

              <!-- Step 2: Payment Action -->
              <div id="payment-action" class="hidden mt-6">
                <div id="stripe-action" class="hidden"><p class="text-sm text-gray-600 mb-4">Complete your payment with Stripe</p><button onclick="processStripePayment()" class="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 font-medium">Pay with Stripe</button></div>
                <div id="paypal-action" class="hidden"><p class="text-sm text-gray-600 mb-4">Complete your payment with PayPal</p><button onclick="processPayPalPayment()" class="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium">Pay with PayPal</button></div>
                <div id="checkout-action" class="hidden"><p class="text-sm text-gray-600 mb-4">Complete your purchase on ${escapeHtml(storeInfo?.name || 'the store')}</p><button onclick="goToStoreCheckout()" class="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-gray-800 font-medium">Go to ${escapeHtml(storeInfo?.name || 'Store')}</button></div>
              </div>` : `<div class="payment-lock-stage" data-lock-target="${paymentLockTarget.tab}">
                <div class="payment-lock-preview" aria-hidden="true"><p class="text-sm text-gray-600 mb-3">Available payment methods</p><div class="space-y-2">${paymentProviderRows || '<div class="payment-method-btn border p-4 bg-white"><span class="font-medium">Secure payment</span></div>'}${checkoutPaymentRow}</div></div>
                <div class="payment-lock-card" role="status" aria-labelledby="payment-lock-title">
                  <div class="flex items-start gap-3"><span class="payment-lock-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><div><h4 id="payment-lock-title">Complete checkout details to pay</h4><p>Your available payment methods are ready once these steps are complete.</p></div></div>
                  <ul>${paymentIssueList}</ul>
                  <button type="button" onclick="switchTab('${paymentLockTarget.tab}')" class="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md hover:bg-gray-800">${paymentLockTarget.label}</button>
                </div>
              </div>`}
            </div>
          </div>
        </div>
      </div>

      <script>
        const cartId = ${scriptJson(cartId)};
        const storeId = ${scriptJson(storeId)};

        ${iframeAutoResizeScript}

        // Tab switching
        function switchTab(tabName) {
          // Update tab buttons
          const allTabs = document.querySelectorAll('.tab-button');
          allTabs.forEach(tab => tab.classList.remove('active'));
          document.getElementById('tab-' + tabName).classList.add('active');

          // Update tab content
          const allContent = document.querySelectorAll('.tab-content');
          allContent.forEach(content => content.classList.add('hidden'));
          document.getElementById('content-' + tabName).classList.remove('hidden');
        }

        function refreshCart() {
          // Remember the current active tab
          const activeTab = document.querySelector('.tab-button.active');
          const activeTabId = activeTab ? activeTab.id.replace('tab-', '') : 'cart';

          // Call viewCart to get fresh cart HTML
          const messageId = 'refresh-cart-' + Date.now();

          const handleResponse = (event) => {
            if (event.data.messageId === messageId && event.data.type === 'ui-message-response') {
              window.removeEventListener('message', handleResponse);

              try {
                const response = event.data.payload && event.data.payload.response;
                const content = response && response.content && response.content[0];

                if (content && content.resource && content.resource.text) {
                  // Parse the new HTML without replacing the document
                  const parser = new DOMParser();
                  const newDoc = parser.parseFromString(content.resource.text, 'text/html');

                  // For cart tab - extract all old images first before any DOM changes
                  const oldCartContent = document.getElementById('content-cart');
                  const newCartContent = newDoc.getElementById('content-cart');
                  if (oldCartContent && newCartContent) {
                    // Create a temporary div to hold the new content
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newCartContent.innerHTML;

                    // Before the temp div is added to DOM, replace all its images with old ones
                    const oldImages = Array.from(oldCartContent.querySelectorAll('img'));
                    const newImages = Array.from(tempDiv.querySelectorAll('img'));

                    // Match images by src and replace in temp div
                    newImages.forEach(newImg => {
                      const matchingOldImg = oldImages.find(oldImg => oldImg.src === newImg.src);
                      if (matchingOldImg) {
                        newImg.replaceWith(matchingOldImg.cloneNode(true));
                      }
                    });

                    // Now update the cart content with images already swapped
                    oldCartContent.innerHTML = tempDiv.innerHTML;
                  }

                  // Update other tabs normally (no images to worry about)
                  const otherTabs = ['address', 'shipping', 'payment'];
                  otherTabs.forEach(tabId => {
                    const oldContent = document.getElementById('content-' + tabId);
                    const newContent = newDoc.getElementById('content-' + tabId);
                    if (oldContent && newContent) {
                      oldContent.innerHTML = newContent.innerHTML;
                    }
                  });

                  // Restore the active tab
                  switchTab(activeTabId);
                } else {
                  console.error('[Cart] No HTML found in response:', content);
                }
              } catch (e) {
                console.error('[Cart] Error refreshing cart:', e);
              }
            }
          };

          window.addEventListener('message', handleResponse);

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'viewCart',
              params: { storeId, cartId }
            }
          }, '*');
        }

        function updateQuantity(lineItemId, newQuantity) {
          if (newQuantity < 1) return;

          const messageId = 'update-' + Date.now();

          const handleResponse = (event) => {
            if (event.data.messageId === messageId && event.data.type === 'ui-message-response') {
              window.removeEventListener('message', handleResponse);

              try {
                const response = event.data.payload && event.data.payload.response;
                const text = response && response.content && response.content[0] && response.content[0].text;

                if (text) {
                  const result = JSON.parse(text);
                  if (!result.error) {
                    // On success, refresh the cart
                    refreshCart();
                  }
                }
              } catch (e) {
                console.error('[Cart] Error processing updateCartItem response:', e);
              }
            }
          };

          window.addEventListener('message', handleResponse);

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'updateCartItem',
              params: {
                storeId,
                cartId,
                lineItemId,
                quantity: newQuantity
              }
            }
          }, '*');

        }

        function removeItem(lineItemId) {
          const messageId = 'remove-' + Date.now();

          const handleResponse = (event) => {
            if (event.data.messageId === messageId && event.data.type === 'ui-message-response') {
              window.removeEventListener('message', handleResponse);

              try {
                const response = event.data.payload && event.data.payload.response;
                const text = response && response.content && response.content[0] && response.content[0].text;

                if (text) {
                  const result = JSON.parse(text);
                  if (!result.error) {
                    // On success, refresh the cart
                    refreshCart();
                  }
                }
              } catch (e) {
                console.error('[Cart] Error processing removeCartItem response:', e);
              }
            }
          };

          window.addEventListener('message', handleResponse);

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'removeCartItem',
              params: {
                storeId,
                cartId,
                lineItemId
              }
            }
          }, '*');

        }

        function saveAddressDetails() {
          const ids = ['address-email', 'address-first-name', 'address-last-name', 'address-line1', 'address-city', 'address-postal-code', 'address-country-code', 'address-phone'];
          const fields = ids.map(id => document.getElementById(id));
          const invalidField = fields.find(field => !field || !field.value.trim() || !field.checkValidity());
          if (invalidField) {
            invalidField?.reportValidity();
            return;
          }
          const params = {
            storeId,
            cartId,
            email: document.getElementById('address-email').value.trim(),
            firstName: document.getElementById('address-first-name').value.trim(),
            lastName: document.getElementById('address-last-name').value.trim(),
            address1: document.getElementById('address-line1').value.trim(),
            city: document.getElementById('address-city').value.trim(),
            postalCode: document.getElementById('address-postal-code').value.trim(),
            countryCode: document.getElementById('address-country-code').value.trim().toLowerCase(),
            province: document.getElementById('address-province').value.trim(),
            company: document.getElementById('address-company').value.trim(),
            phone: document.getElementById('address-phone').value.trim(),
          };
          const messageId = 'address-' + Date.now();
          const handleResponse = event => {
            if (event.data?.messageId !== messageId || event.data?.type !== 'ui-message-response') return;
            window.removeEventListener('message', handleResponse);
            const content = event.data.payload?.response?.content?.[0];
            if (content?.resource?.uri?.startsWith('ui://marketplace/email-conflict')) return;
            if (content?.text) {
              try { if (!JSON.parse(content.text).error) refreshCart(); } catch {}
            }
          };
          window.addEventListener('message', handleResponse);
          window.parent.postMessage({
            type: 'tool',
            messageId,
            payload: { toolName: 'setShippingAddress', params },
          }, '*');
        }

        function selectShippingMethod(optionId, optionName) {
          const messageId = 'shipping-' + Date.now();

          const handleResponse = (event) => {
            if (event.data.messageId === messageId && event.data.type === 'ui-message-response') {
              window.removeEventListener('message', handleResponse);

              try {
                const response = event.data.payload && event.data.payload.response;
                const text = response && response.content && response.content[0] && response.content[0].text;

                if (text) {
                  const result = JSON.parse(text);
                  if (!result.error) {
                    // On success, refresh the cart
                    refreshCart();
                  }
                }
              } catch (e) {
                console.error('[Cart] Error processing setShippingMethod response:', e);
              }
            }
          };

          window.addEventListener('message', handleResponse);

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'setShippingMethod',
              params: {
                storeId,
                cartId,
                shippingMethodId: optionId
              }
            }
          }, '*');

        }

        function selectPaymentProvider(provider) {
          // Update radio button selection
          const allBtns = document.querySelectorAll('.payment-method-btn');
          allBtns.forEach(btn => {
            const isSelected = btn.dataset.provider === provider;
            btn.classList.toggle('is-selected', isSelected);
            btn.setAttribute('aria-pressed', String(isSelected));
          });

          // Show payment action section
          document.getElementById('payment-action').classList.remove('hidden');

          // Hide all payment actions
          document.getElementById('stripe-action').classList.add('hidden');
          document.getElementById('paypal-action').classList.add('hidden');
          document.getElementById('checkout-action').classList.add('hidden');

          // Show the selected payment action
          if (provider === 'stripe') {
            document.getElementById('stripe-action').classList.remove('hidden');
          } else if (provider === 'paypal') {
            document.getElementById('paypal-action').classList.remove('hidden');
          } else if (provider === 'checkout') {
            document.getElementById('checkout-action').classList.remove('hidden');
          }
        }

        function processStripePayment() {
          const messageId = 'stripe-payment-' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'initiatePaymentSession',
              params: {
                storeId,
                cartId,
                paymentProvider: 'stripe'
              }
            }
          }, '*');
        }

        function processPayPalPayment() {
          const messageId = 'paypal-payment-' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'initiatePaymentSession',
              params: {
                storeId,
                cartId,
                paymentProvider: 'paypal'
              }
            }
          }, '*');
        }

        function goToStoreCheckout() {
          const messageId = 'checkout-link-' + Date.now();

          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: {
              toolName: 'getCheckoutLink',
              params: {
                storeId,
                cartId,
                countryCode: ${scriptJson(cart.region?.countries?.[0]?.iso2 || 'us')}
              }
            }
          }, '*');
        }
      </script>
    </body>
    </html>
  `;

  return htmlContent;
}

/**
 * Generate the login form UI for OpenFront
 * Extracted from cart-tools.ts loginUser tool (lines 1856-2046)
 */
export function generateOpenFrontLoginUI(params: {
  storeId: string;
  email?: string;
  message?: string;
  cartId?: string;
  addressData?: any;
}): string {
  const { storeId, email, message, cartId, addressData } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>${beautifulUIStyles}</style>
    </head>
    <body>
      <div class="max-w-3xl mx-auto">
        <div class="mcp-card bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h2 class="text-base font-bold text-gray-900 mb-1">Login to Continue</h2>
          <p class="text-sm text-gray-700 mb-3 sm:mb-4 leading-tight">${escapeHtml(message || 'An account with this email already exists. Please login.')}</p>

          <div class="space-y-3 sm:space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value="${escapeHtml(email || '')}"
                class="w-full px-3 sm:px-4 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                class="w-full px-3 sm:px-4 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <p id="login-error" class="mt-2 text-sm text-red-600 hidden" aria-live="polite"></p>

            <button
              onclick="handleLogin()"
              id="login-button"
              class="w-full bg-gray-900 text-white py-3 px-4 rounded-md hover:bg-gray-800 font-medium"
            >
              Login
            </button>
          </div>
        </div>
      </div>

      <script>
        const storeId = ${scriptJson(storeId)};
        const cartId = ${scriptJson(cartId || '')};
        const addressData = ${addressData ? scriptJson(addressData) : 'null'};

        let currentLoginMessageId = null;
        let loginResponseHandler = null;

        function setLoadingState(isLoading) {
          const btn = document.getElementById('login-button');
          if (!btn) return;
          if (isLoading) {
            btn.disabled = true;
            btn.textContent = 'Authenticating...';
          } else {
            btn.disabled = false;
            btn.textContent = 'Login';
          }
        }

        function showError(message) {
          const el = document.getElementById('login-error');
          if (!el) return;
          el.textContent = message || 'Login failed. Please check your credentials and try again.';
          el.classList.remove('hidden');
        }

        function clearError() {
          const el = document.getElementById('login-error');
          if (!el) return;
          el.textContent = '';
          el.classList.add('hidden');
        }

        function handleLogin() {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;


          // Reset UI
          clearError();
          setLoadingState(true);

          // Prepare tool metadata
          const metadata = {
            action: 'authenticateUser',
            email: email,
            password: password,
            storeId: storeId
          };

          if (cartId) metadata.cartId = cartId;
          if (addressData) metadata.addressData = addressData;

          // Generate messageId and wire response listener
          const messageId = 'tool-' + Date.now();
          currentLoginMessageId = messageId;

          if (loginResponseHandler) {
            window.removeEventListener('message', loginResponseHandler);
          }

          loginResponseHandler = function(event) {
            const data = event.data || {};
            if (data.messageId !== messageId) return;

            if (data.type === 'ui-message-received') {
              // Parent acknowledged receipt
              return; // no-op, already set loading
            }

            if (data.type === 'ui-message-response') {
              window.removeEventListener('message', loginResponseHandler);
              currentLoginMessageId = null;

              try {
                const response = data.payload && data.payload.response;
                const text = response && response.content && response.content[0] && response.content[0].text;
                if (!text) {
                  setLoadingState(false);
                  showError('Unexpected response from server.');
                  return;
                }

                try {
                  const parsed = JSON.parse(text);
                  // Success path
                  if (parsed && parsed.__clientAction && parsed.__clientAction.type === 'saveSessionToken') {
                    const btn = document.getElementById('login-button');
                    if (btn) { btn.textContent = 'Logged in ✓'; btn.disabled = true; }
                    return;
                  }
                  // Otherwise, treat as message
                  setLoadingState(false);
                  showError(parsed.message || 'Login failed.');
                } catch (e) {
                  // Not JSON -> likely error string like "❌ Login failed: ..."
                  setLoadingState(false);
                  showError(text);
                }
              } catch (err) {
                setLoadingState(false);
                showError('Login failed.');
              }
            }
          };

          window.addEventListener('message', loginResponseHandler);

          // Send tool call to parent
          window.parent.postMessage({
            type: 'tool',
            messageId,
            payload: {
              toolName: 'authenticateUser',
              params: metadata
            }
          }, '*');

        }

        ${iframeAutoResizeScript}
      </script>
    </body>
    </html>
  `;

  return htmlContent;
}

/**
 * Generate the email conflict UI for OpenFront
 * Extracted from cart-tools.ts setShippingAddress error handling (lines 1331-1476)
 */
export function generateOpenFrontEmailConflictUI(params: {
  storeId: string;
  email: string;
  cartId: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  province: string;
  company: string;
  phone: string;
  storeName: string;
  checkoutUrl: string;
}): string {
  const { storeId, email, cartId, firstName, lastName, address1, city, postalCode, countryCode, province, company, phone, storeName } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>${beautifulUIStyles}</style>
    </head>
    <body>
      <div class="max-w-3xl mx-auto">
        <div class="mcp-card bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h2 class="text-base font-bold text-gray-900 mb-1">Email Already in Use</h2>
          <p class="text-sm text-gray-700 mb-3 sm:mb-4 leading-tight">The email address <strong>${escapeHtml(email)}</strong> already has an account with ${escapeHtml(storeName)}.</p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              onclick="selectOption('signin')"
              class="option-btn bg-gray-100 border border-gray-300 rounded-lg p-3 sm:p-4 text-left hover:bg-gray-200 transition-colors flex flex-col justify-center gap-1 sm:min-h-[120px]"
              data-option="signin">
              <div>
                <span class="font-medium block text-sm mb-0.5 leading-tight">Sign in with this account here</span>
                <span class="text-xs text-gray-600 leading-tight">Login to continue with this email</span>
              </div>
            </button>

            <button
              onclick="selectOption('different-email')"
              class="option-btn bg-gray-100 border border-gray-300 rounded-lg p-3 sm:p-4 text-left hover:bg-gray-200 transition-colors flex flex-col justify-center gap-1 sm:min-h-[120px]"
              data-option="different-email">
              <div>
                <span class="font-medium block text-sm mb-0.5 leading-tight">Use a different email for this order</span>
                <span class="text-xs text-gray-600 leading-tight">Provide a different email address</span>
              </div>
            </button>

            <button
              type="button"
              onclick="selectOption('checkout-store')"
              class="option-btn bg-gray-100 border border-gray-300 rounded-lg p-3 sm:p-4 text-left hover:bg-gray-200 transition-colors flex flex-col justify-center gap-1 sm:min-h-[120px]"
              data-option="checkout-store">
              <div>
                <span class="font-medium block text-sm mb-0.5 leading-tight">Continue checkout on ${escapeHtml(storeName)}</span>
                <span class="text-xs text-gray-600 leading-tight">Complete your purchase on the store website</span>
              </div>
            </button>
          </div>
          <div id="email-change-fields" class="hidden mt-3">
            <label class="text-xs text-gray-600">Different email<input id="different-email" type="email" maxlength="320" class="mt-1 w-full border rounded-md p-2 text-sm" autocomplete="email"></label>
          </div>
          <p id="conflict-status" class="mt-2 text-sm text-gray-600" aria-live="polite"></p>

          <button
            id="continue-btn"
            onclick="handleContinue()"
            class="w-full mt-4 bg-gray-900 text-white py-3 px-4 rounded-md hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled>
            Continue
          </button>
        </div>
      </div>

      <script>
        const email = ${scriptJson(email)};
        const checkoutUrl = ${scriptJson(safeHttpUrl(params.checkoutUrl))};
        const storeId = ${scriptJson(storeId)};
        const cartId = ${scriptJson(cartId)};

        // Customer-provided data stays inside this sandboxed UI and is sent only
        // through the source-scoped login action after an explicit user choice.
        const addressData = ${scriptJson({ firstName, lastName, address1, city, postalCode, countryCode, province, company, phone })};

        let selectedOption = null;

        ${iframeAutoResizeScript}

        function selectOption(option) {
          selectedOption = option;

          // Update button styles
          const allBtns = document.querySelectorAll('.option-btn');
          allBtns.forEach(btn => {
            if (btn.dataset.option === option) {
              btn.classList.remove('bg-gray-100');
              btn.classList.add('bg-gray-300');
            } else {
              btn.classList.remove('bg-gray-300');
              btn.classList.add('bg-gray-100');
            }
          });

          // Enable continue button
          document.getElementById('continue-btn').disabled = false;
          document.getElementById('email-change-fields').classList.toggle('hidden', option !== 'different-email');
        }

        function handleContinue() {
          if (!selectedOption) return;

          if (selectedOption === 'signin') {
            // Call loginUser MCP tool directly with address data
            const messageId = 'login-' + Date.now();

            window.parent.postMessage({
              type: 'tool',
              messageId: messageId,
              payload: {
                toolName: 'loginUser',
                params: {
                  storeId,
                  email,
                  message: 'Sign in to continue with your order',
                  cartId,
                  addressData
                }
              }
            }, '*');
          } else if (selectedOption === 'different-email') {
            const input = document.getElementById('different-email');
            if (!input || !input.value.trim() || !input.checkValidity()) {
              input?.reportValidity();
              return;
            }
            const messageId = 'address-update-' + Date.now();
            const status = document.getElementById('conflict-status');
            status.textContent = 'Updating this source cart…';
            const handleResponse = event => {
              if (event.data?.messageId !== messageId || event.data?.type !== 'ui-message-response') return;
              window.removeEventListener('message', handleResponse);
              status.textContent = 'The source could not confirm the email change. Please try again or sign in.';
            };
            window.addEventListener('message', handleResponse);
            window.parent.postMessage({
              type: 'tool',
              messageId,
              payload: {
                toolName: 'setShippingAddress',
                params: { storeId, cartId, email: input.value.trim(), ...addressData },
              },
            }, '*');
          } else if (selectedOption === 'checkout-store') {
            if (checkoutUrl) window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
            else document.getElementById('conflict-status').textContent = 'The source did not supply a valid checkout link.';
          }
        }
      </script>
    </body>
    </html>
  `;

  return htmlContent;
}
