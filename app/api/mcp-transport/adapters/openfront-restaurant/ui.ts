import type { Product } from '../types';
import { beautifulUIStyles, iframeAutoResizeScript } from '../../ui/beautiful-ui';
import { getStoreLogoHue } from '@/lib/store-logo';

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

export function generateRestaurantProductUI(params: {
  storeId: string;
  storeUrl: string;
  product: Product;
  countryCode: string;
}): string {
  const { storeId, storeUrl, product, countryCode } = params;
  const restaurant = product.metadata?.restaurant || {};
  const cartAvailable = restaurant.cartAvailable !== false;
  const modifiers = Array.isArray(restaurant.modifiers) ? restaurant.modifiers : [];
  const currency = product.variants[0]?.currency || 'USD';
  const basePrice = product.variants[0]?.price || 0;
  const thumbnail = product.thumbnail?.startsWith('/') ? `${storeUrl}${product.thumbnail}` : product.thumbnail;
  const groups = Array.from(new Set(modifiers.map((modifier: any) => modifier.modifierGroup || 'other'))).map((groupId) => {
    const choices = modifiers.filter((modifier: any) => (modifier.modifierGroup || 'other') === groupId);
    const first = choices[0] || {};
    return {
      id: groupId,
      label: first.modifierGroupLabel || String(groupId),
      required: !!first.required,
      min: first.required ? Math.max(1, first.minSelections || 1) : Math.max(0, first.minSelections || 0),
      max: Math.max(1, first.maxSelections || choices.length || 1),
      choices,
    };
  });

  const groupsHtml = groups.map((group: any) => `
    <fieldset class="modifier-group" data-group-id="${escapeHtml(group.id)}">
      <legend>
        <span>${escapeHtml(group.label)}</span>
        <span class="group-rule">${group.required ? `Choose ${group.min}` : 'Optional'}${group.max > 1 ? ` · up to ${group.max}` : ''}</span>
      </legend>
      <div class="modifier-list">
        ${group.choices.map((choice: any) => `
          <button
            type="button"
            class="modifier-button${choice.defaultSelected ? ' is-selected' : ''}"
            data-group-id="${escapeHtml(group.id)}"
            data-modifier-id="${escapeHtml(choice.id)}"
            aria-pressed="${choice.defaultSelected ? 'true' : 'false'}"
            onclick="toggleModifier(this)"
          >
            <span>${escapeHtml(choice.name)}</span>
            ${choice.priceAdjustment ? `<span>+${escapeHtml(formatMoney(choice.priceAdjustment, currency))}</span>` : '<span>Included</span>'}
          </button>
        `).join('')}
      </div>
    </fieldset>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${beautifulUIStyles}
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--surface); color: var(--ink); }
    .menu-item { display: grid; grid-template-columns: 148px minmax(0, 1fr); }
    .menu-image { width: 100%; height: 100%; min-height: 180px; object-fit: cover; background: var(--inset); }
    .menu-image-empty { min-height: 180px; display: grid; place-items: center; background: var(--inset); color: var(--ink-3); font-size: 12px; }
    .menu-copy { min-width: 0; padding: 16px; }
    .menu-kicker { margin: 0 0 4px; color: var(--ink-3); font: 600 10px/1.2 var(--font-code); letter-spacing: .08em; text-transform: uppercase; }
    h2 { margin: 0; font-size: 18px; line-height: 1.25; letter-spacing: -.02em; }
    .price { margin: 7px 0 0; font-size: 16px; font-weight: 650; }
    .facts { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--ink-3); font-size: 11px; }
    .description { margin: 10px 0 0; color: var(--ink-2); font-size: 12px; line-height: 1.5; }
    .customize { border-top: 1px solid var(--line); padding: 14px 16px 16px; }
    .modifier-group { margin: 0 0 14px; padding: 0; border: 0; }
    .modifier-group legend { display: flex; width: 100%; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .06em; }
    .group-rule { color: var(--ink-3); font: 500 10px/1.3 var(--font-code); letter-spacing: 0; text-transform: none; }
    .modifier-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .modifier-button { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 34px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--ink-2); font: 500 11.5px/1.3 var(--font-body); text-align: left; cursor: pointer; }
    .modifier-button:hover { background: var(--hover); color: var(--ink); }
    .modifier-button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
    .modifier-button.is-selected { border-color: var(--signal); background: var(--signal-tint); color: var(--signal-ink); }
    .modifier-button span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .modifier-button span:last-child { flex-shrink: 0; color: var(--ink-3); font-size: 10px; }
    .instructions-label { display: block; margin-bottom: 6px; color: var(--ink-3); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    textarea { width: 100%; min-height: 58px; resize: vertical; border: 1px solid var(--line); border-radius: 5px; background: var(--field); color: var(--ink); padding: 8px 9px; font: 400 12px/1.4 var(--font-body); }
    textarea:focus { border-color: var(--line-strong); outline: none; }
    .purchase-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .quantity { display: flex; height: 34px; align-items: center; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); }
    .quantity button { width: 30px; height: 32px; border: 0; background: transparent; color: var(--ink-2); cursor: pointer; font-size: 16px; }
    .quantity span { width: 24px; text-align: center; font-size: 12px; font-weight: 600; }
    .add-button { min-width: 0; flex: 1; height: 34px; border: 0; border-radius: 5px; background: var(--ink); color: var(--surface); padding: 0 12px; font: 600 12px/1 var(--font-body); cursor: pointer; }
    .add-button:hover { opacity: .9; }
    .add-button:disabled { cursor: not-allowed; opacity: .4; }
    .validation { min-height: 16px; margin: 5px 0 0; color: var(--red); font-size: 10.5px; }
    @media (max-width: 520px) {
      .menu-item { grid-template-columns: 104px minmax(0, 1fr); }
      .menu-image, .menu-image-empty { min-height: 140px; }
      .menu-copy { padding: 12px; }
      .modifier-list { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <article>
    <section class="menu-item">
      ${thumbnail
        ? `<img class="menu-image" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(product.title)}" />`
        : '<div class="menu-image-empty">No image</div>'}
      <div class="menu-copy">
        <p class="menu-kicker">${escapeHtml(restaurant.category?.name || 'Menu item')}</p>
        <h2>${escapeHtml(product.title)}</h2>
        <p class="price" id="item-price">${escapeHtml(formatMoney(basePrice, currency))}</p>
        <div class="facts">
          ${restaurant.prepTime ? `<span>${escapeHtml(restaurant.prepTime)} min</span>` : ''}
          ${restaurant.calories ? `<span>${escapeHtml(restaurant.calories)} cal</span>` : ''}
          ${(restaurant.dietaryFlags || []).map((flag: string) => `<span>${escapeHtml(flag)}</span>`).join('')}
        </div>
        ${product.description ? `<p class="description">${escapeHtml(product.description)}</p>` : ''}
      </div>
    </section>
    <section class="customize">
      ${groupsHtml}
      <label class="instructions-label" for="special-instructions">Special instructions</label>
      <textarea id="special-instructions" placeholder="Sauce on the side, no onions…"></textarea>
      <p class="validation" id="validation-message" aria-live="polite">${cartAvailable ? '' : 'Marketplace ordering is not available for this restaurant yet.'}</p>
      <div class="purchase-row">
        <div class="quantity" aria-label="Quantity">
          <button type="button" onclick="changeQuantity(-1)" aria-label="Decrease quantity">−</button>
          <span id="quantity">1</span>
          <button type="button" onclick="changeQuantity(1)" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="add-button" id="add-button" onclick="addToCart()"${cartAvailable ? '' : ' disabled'}>${cartAvailable ? `Add to cart · ${escapeHtml(formatMoney(basePrice, currency))}` : 'Cart unavailable'}</button>
      </div>
    </section>
  </article>
  <script>
    ${iframeAutoResizeScript}
    const groups = ${scriptJson(groups)};
    const basePrice = ${basePrice};
    const currency = ${scriptJson(currency)};
    const cartAvailable = ${scriptJson(cartAvailable)};
    const selected = new Set(${scriptJson(modifiers.filter((modifier: any) => modifier.defaultSelected).map((modifier: any) => modifier.id))});
    let quantity = 1;

    function money(amount) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
    }

    function selectedInGroup(group) {
      return group.choices.filter(choice => selected.has(choice.id));
    }

    function selectionIssue() {
      for (const group of groups) {
        const count = selectedInGroup(group).length;
        if (count < group.min) return 'Choose ' + group.min + ' option' + (group.min === 1 ? '' : 's') + ' for ' + group.label + '.';
        if (count > group.max) return 'Choose no more than ' + group.max + ' for ' + group.label + '.';
      }
      return '';
    }

    function updateUi() {
      const modifierTotal = groups.flatMap(group => selectedInGroup(group)).reduce((sum, choice) => sum + (choice.priceAdjustment || 0), 0);
      const total = (basePrice + modifierTotal) * quantity;
      document.getElementById('quantity').textContent = String(quantity);
      document.getElementById('item-price').textContent = money(basePrice + modifierTotal);
      document.getElementById('add-button').textContent = cartAvailable ? 'Add to cart · ' + money(total) : 'Cart unavailable';
      const issue = cartAvailable ? selectionIssue() : 'Marketplace ordering is not available for this restaurant yet.';
      document.getElementById('validation-message').textContent = issue;
      document.getElementById('add-button').disabled = !cartAvailable || Boolean(issue);
      document.querySelectorAll('.modifier-button').forEach(button => {
        const active = selected.has(button.dataset.modifierId);
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }

    function toggleModifier(button) {
      const group = groups.find(candidate => candidate.id === button.dataset.groupId);
      const id = button.dataset.modifierId;
      if (!group || !id) return;
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        const active = selectedInGroup(group);
        if (group.max === 1) active.forEach(choice => selected.delete(choice.id));
        else if (active.length >= group.max) return;
        selected.add(id);
      }
      updateUi();
    }

    function changeQuantity(delta) {
      quantity = Math.max(1, Math.min(25, quantity + delta));
      updateUi();
    }

    function addToCart() {
      if (!cartAvailable) return;
      const issue = selectionIssue();
      if (issue) { updateUi(); return; }
      const button = document.getElementById('add-button');
      button.disabled = true;
      button.textContent = 'Adding…';
      window.parent.postMessage({
        type: 'tool',
        messageId: 'restaurant-add-' + Date.now(),
        payload: {
          toolName: 'addToCart',
          params: {
            storeId: ${scriptJson(storeId)},
            variantId: ${scriptJson(product.id)},
            modifierIds: Array.from(selected),
            specialInstructions: document.getElementById('special-instructions').value.trim(),
            quantity,
            orderType: 'pickup',
            countryCode: ${scriptJson(countryCode)}
          }
        }
      }, '*');
    }

    window.toggleModifier = toggleModifier;
    window.changeQuantity = changeQuantity;
    window.addToCart = addToCart;
    updateUi();
  </script>
</body>
</html>`;
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
  const directPaymentProviders = (storeInfo?.paymentProviders || []).filter(
    (provider: any) => ['stripe', 'paypal'].includes(provider.provider) && provider.publishableKey
  );
  const hasCash = (storeInfo?.paymentProviders || []).some(
    (provider: any) => ['cash', 'manual', 'pp_system_default'].includes(provider.provider)
  );
  const paymentIcon = (provider: string) => provider === 'stripe'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#635bff" d="M13.98 9.15c-2.18-.81-3.36-1.43-3.36-2.41 0-.83.68-1.3 1.9-1.3 2.23 0 4.52.85 6.09 1.63l.89-5.5C18.25.98 15.7 0 12.17 0 9.67 0 7.59.65 6.1 1.87 4.56 3.15 3.76 4.99 3.76 7.22c0 4.04 2.47 5.76 6.47 7.22 2.59.92 3.45 1.57 3.45 2.58 0 .98-.84 1.55-2.36 1.55-1.87 0-4.96-.92-6.99-2.11l-.9 5.55C5.18 22.99 8.39 24 11.71 24c2.64 0 4.85-.62 6.33-1.81 1.66-1.31 2.53-3.24 2.53-5.73 0-4.13-2.53-5.85-6.59-7.31Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#0070e0" d="M15.61 4.65H8.94L6.65 19.25H1.82L4.86 0h8c3.75 0 6.37 2.29 6.47 5.51-.65-.48-2.11-.86-3.72-.86Zm6.57 5.55c0 3.41-3.01 6.85-6.96 6.85h-2.49L11.6 24H6.74l1.85-11.54h3.59c4.21 0 7.35-3.63 7.15-6.95a5.24 5.24 0 0 1 2.85 4.69Z"/></svg>';
  const paymentRows = directPaymentProviders.map((provider: any) => `
    <button type="button" class="payment-method" onclick="beginPayment(${scriptJson(provider.provider)})">
      <span class="payment-copy"><span class="choice-radio"></span><span>Pay with ${escapeHtml(provider.provider)}</span></span>
      <span class="provider-icon">${paymentIcon(provider.provider)}</span>
    </button>
  `).join('');
  const itemRows = items.map((item: any) => {
    const thumbnail = item.thumbnail || item.menuItem?.thumbnail;
    const thumbnailUrl = thumbnail?.startsWith('/') ? `${storeUrl}${thumbnail}` : thumbnail;
    const modifierTotal = (item.modifiers || []).reduce((sum: number, modifier: any) => sum + (modifier.priceAdjustment || 0), 0);
    const unitPrice = (item.menuItem?.price || 0) + modifierTotal;
    return `<div class="cart-item">
      ${thumbnailUrl ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(item.menuItem?.name)}" />` : '<div class="thumb-empty">No image</div>'}
      <div class="item-copy">
        <div class="item-head"><h3>${escapeHtml(item.menuItem?.name || 'Menu item')}</h3><strong>${escapeHtml(formatMoney(unitPrice * (item.quantity || 1), currency))}</strong></div>
        ${(item.modifiers || []).length ? `<p>${(item.modifiers || []).map((modifier: any) => escapeHtml(modifier.name)).join(' · ')}</p>` : ''}
        ${item.specialInstructions ? `<p class="instructions">${escapeHtml(item.specialInstructions)}</p>` : ''}
        <div class="item-actions">
          <div class="quantity">
            <button type="button" onclick="updateQuantity(${scriptJson(item.id)}, ${Math.max(1, (item.quantity || 1) - 1)})" ${(item.quantity || 1) <= 1 ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
            <span>${escapeHtml(item.quantity || 1)}</span>
            <button type="button" onclick="updateQuantity(${scriptJson(item.id)}, ${(item.quantity || 1) + 1})" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="remove" onclick="removeItem(${scriptJson(item.id)})">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${beautifulUIStyles}
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--surface); color: var(--ink); }
    button, a { font: inherit; }
    .cart-shell { border: 1px solid var(--line); background: var(--surface); }
    .cart-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding: 12px; }
    .store-identity { min-width: 0; display: flex; align-items: center; gap: 9px; }
    .store-logo { width: 28px; height: 28px; flex: 0 0 auto; overflow: hidden; }
    .store-logo > svg { display: block; width: 100%; height: 100%; }
    .cart-header h2 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 1.25; }
    .cart-header p { margin: 2px 0 0; color: var(--ink-3); font-size: 10.5px; }
    .order-type { flex: 0 0 auto; color: var(--ink-3); font: 600 10px/1 var(--font-code); text-transform: uppercase; letter-spacing: .08em; }
    .tabs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--line); }
    .tab { position: relative; height: 34px; border: 0; background: transparent; color: var(--ink-3); font-size: 11px; font-weight: 600; cursor: pointer; }
    .tab.is-active { color: var(--ink); }
    .tab.is-active::after { content: ''; position: absolute; right: 12px; bottom: -1px; left: 12px; height: 1px; background: var(--signal); }
    .panel[hidden] { display: none; }
    .cart-item { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 10px; border-bottom: 1px solid var(--line); padding: 11px 12px; }
    .cart-item img, .thumb-empty { width: 62px; height: 62px; object-fit: cover; background: var(--inset); }
    .thumb-empty { display: grid; place-items: center; color: var(--ink-3); font-size: 9px; }
    .item-copy { min-width: 0; }
    .item-head { display: flex; justify-content: space-between; gap: 10px; }
    .item-head h3 { min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
    .item-head strong { flex-shrink: 0; font-size: 12px; }
    .item-copy p { margin: 3px 0 0; color: var(--ink-3); font-size: 10.5px; line-height: 1.35; }
    .item-copy .instructions { color: var(--ink-2); font-style: italic; }
    .item-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
    .quantity { display: flex; height: 26px; align-items: center; border: 1px solid var(--line); border-radius: 5px; }
    .quantity button { width: 26px; height: 24px; border: 0; background: transparent; color: var(--ink-2); cursor: pointer; }
    .quantity button:disabled { cursor: default; opacity: .35; }
    .quantity span { min-width: 20px; text-align: center; font-size: 11px; font-weight: 600; }
    .remove { border: 0; background: transparent; color: var(--red); font-size: 10.5px; cursor: pointer; }
    .empty { padding: 28px 16px; text-align: center; color: var(--ink-3); font-size: 12px; }
    .summary { padding: 12px; background: var(--inset); }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; color: var(--ink-3); font-size: 11px; }
    .summary-row + .summary-row { margin-top: 5px; }
    .summary-row.total { margin-top: 9px; border-top: 1px solid var(--line); padding-top: 9px; color: var(--ink); font-size: 13px; font-weight: 650; }
    .payment-panel { padding: 12px; }
    .payment-panel h3 { margin: 0; font-size: 13px; }
    .payment-panel > p { margin: 4px 0 10px; color: var(--ink-3); font-size: 10.5px; line-height: 1.4; }
    .payment-method, .checkout { display: flex; width: 100%; min-height: 38px; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--line-strong); border-radius: 5px; background: var(--surface); color: var(--ink); padding: 8px 10px; text-decoration: none; cursor: pointer; }
    .payment-method + .payment-method, .payment-method + .checkout, .checkout + .payment-note { margin-top: 6px; }
    .payment-method:hover, .checkout:hover { background: var(--hover); }
    .payment-copy { display: flex; align-items: center; gap: 9px; font-size: 11.5px; font-weight: 600; text-transform: capitalize; }
    .choice-radio { width: 14px; height: 14px; border: 1.5px solid var(--line-strong); border-radius: 50%; }
    .provider-icon, .provider-icon svg { display: block; width: 18px; height: 18px; }
    .checkout { margin-top: ${paymentRows ? '6px' : '0'}; font-size: 11.5px; font-weight: 600; }
    .checkout-logo { width: 18px; height: 18px; overflow: hidden; }
    .checkout-logo > svg { display: block; width: 100%; height: 100%; }
    .payment-note { color: var(--ink-3); font-size: 10px; line-height: 1.4; }
    @media (max-width: 360px) {
      .cart-header { padding: 10px; }
      .cart-item { grid-template-columns: 54px minmax(0, 1fr); padding: 10px; }
      .cart-item img, .thumb-empty { width: 54px; height: 54px; }
    }
  </style>
</head>
<body>
  <section class="cart-shell">
    <header class="cart-header">
      <div class="store-identity">
        ${storeInfo?.logoIcon ? `<div class="store-logo" style="filter: hue-rotate(${logoHue}deg)">${storeInfo.logoIcon}</div>` : ''}
        <div><h2>${escapeHtml(storeInfo?.name || 'Restaurant cart')}</h2><p>${escapeHtml(items.length)} ${items.length === 1 ? 'item' : 'items'}</p></div>
      </div>
      <span class="order-type">${escapeHtml(cart.orderType || 'pickup')}</span>
    </header>
    <nav class="tabs" aria-label="Cart sections">
      <button type="button" id="tab-cart" class="tab is-active" onclick="showPanel('cart')">Cart</button>
      <button type="button" id="tab-payment" class="tab" onclick="showPanel('payment')">Payment</button>
    </nav>
    <div id="panel-cart" class="panel">
      ${itemRows || '<div class="empty">Your restaurant cart is empty.</div>'}
      <div class="summary">
        <div class="summary-row"><span>Subtotal</span><span>${escapeHtml(formatMoney(cart.subtotal || 0, currency))}</span></div>
        ${cart.pickupDiscount ? `<div class="summary-row"><span>Pickup discount</span><span>−${escapeHtml(formatMoney(cart.pickupDiscount, currency))}</span></div>` : ''}
        ${cart.deliveryFee ? `<div class="summary-row"><span>Delivery</span><span>${escapeHtml(formatMoney(cart.deliveryFee, currency))}</span></div>` : ''}
        ${cart.tax ? `<div class="summary-row"><span>Tax</span><span>${escapeHtml(formatMoney(cart.tax, currency))}</span></div>` : ''}
        ${cart.tip ? `<div class="summary-row"><span>Tip</span><span>${escapeHtml(formatMoney(cart.tip, currency))}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>${escapeHtml(formatMoney(cart.total ?? cart.subtotal ?? 0, currency))}</span></div>
      </div>
    </div>
    <div id="panel-payment" class="panel payment-panel" hidden>
      <h3>Payment method</h3>
      <p>Pay here with a configured provider, or finish directly with ${escapeHtml(storeInfo?.name || 'the restaurant')}.</p>
      ${paymentRows}
      <a class="checkout" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noopener noreferrer">
        <span>${hasCash ? 'Continue for cash or other payment' : 'Checkout on the restaurant'}</span>
        ${storeInfo?.logoIcon ? `<span class="checkout-logo" style="filter: hue-rotate(${logoHue}deg)">${storeInfo.logoIcon}</span>` : ''}
      </a>
      ${hasCash ? '<p class="payment-note">Cash/manual payment is completed on the restaurant checkout.</p>' : ''}
    </div>
  </section>
  <script>
    ${iframeAutoResizeScript}
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
    function showPanel(panel) {
      ['cart', 'payment'].forEach(function (name) {
        document.getElementById('panel-' + name).hidden = name !== panel;
        document.getElementById('tab-' + name).classList.toggle('is-active', name === panel);
      });
    }
    function responseSucceeded(response) {
      try {
        const text = response && response.content && response.content[0] && response.content[0].text;
        return Boolean(text && !JSON.parse(text).error);
      } catch {
        return false;
      }
    }
    function refreshCart() {
      const activePanel = document.getElementById('panel-payment').hidden ? 'cart' : 'payment';
      sendTool('viewCart', { storeId: ${scriptJson(storeId)}, cartId: ${scriptJson(cartId)} }, function (response) {
        try {
          const content = response && response.content && response.content[0];
          const html = content && content.resource && content.resource.text;
          if (!html) return;
          const nextDocument = new DOMParser().parseFromString(html, 'text/html');
          const currentShell = document.querySelector('.cart-shell');
          const nextShell = nextDocument.querySelector('.cart-shell');
          if (!currentShell || !nextShell) return;
          currentShell.innerHTML = nextShell.innerHTML;
          showPanel(activePanel);
        } catch (error) {
          console.error('[Restaurant cart] Could not refresh cart', error);
        }
      });
    }
    function updateQuantity(lineItemId, quantity) {
      sendTool('updateCartItem', { storeId: ${scriptJson(storeId)}, cartId: ${scriptJson(cartId)}, lineItemId, quantity }, function (response) {
        if (responseSucceeded(response)) refreshCart();
      });
    }
    function removeItem(lineItemId) {
      sendTool('removeCartItem', { storeId: ${scriptJson(storeId)}, cartId: ${scriptJson(cartId)}, lineItemId }, function (response) {
        if (responseSucceeded(response)) refreshCart();
      });
    }
    function beginPayment(paymentProvider) {
      sendTool('initiatePaymentSession', { storeId: ${scriptJson(storeId)}, cartId: ${scriptJson(cartId)}, paymentProvider });
    }
    window.showPanel = showPanel;
    window.updateQuantity = updateQuantity;
    window.removeItem = removeItem;
    window.beginPayment = beginPayment;
  </script>
</body>
</html>`;
}
