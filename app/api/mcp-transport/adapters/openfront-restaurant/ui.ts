import type { Product } from '../types';
import { beautifulUIStyles, iframeAutoResizeScript } from '../../ui/beautiful-ui';
import { escapeHtml, safeHttpUrl, scriptJson } from '@/lib/safe-content';

function formatMoney(amount: number | undefined, currency: string): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
    return 'Price unavailable';
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
  } catch {
    return 'Price unavailable';
  }
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
  const basePrice = product.variants[0]?.price;
  const thumbnail = safeHttpUrl(product.thumbnail, storeUrl);
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
    body { margin: 0; background: var(--canvas); color: var(--ink); }
    article { overflow: hidden; border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-card); }
    .menu-item { display: grid; grid-template-columns: 148px minmax(0, 1fr); }
    .menu-image { width: 100%; height: 100%; min-height: 180px; object-fit: cover; background: var(--inset); }
    .menu-image-empty { min-height: 180px; display: grid; place-items: center; background: var(--inset); color: var(--ink-3); font-size: 12px; }
    .menu-copy { min-width: 0; padding: 16px; }
    .menu-kicker { margin: 0 0 4px; color: var(--ink-3); font: 600 10px/1.2 var(--font-code); letter-spacing: .08em; text-transform: uppercase; }
    h2 { margin: 0; font-size: 20px; font-weight: 680; line-height: 1.18; letter-spacing: -.025em; }
    .price { display: inline-block; margin: 8px 0 0; border-radius: 6px; background: var(--inset); padding: 4px 7px; color: var(--ink-2); font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; box-shadow: var(--shadow-hairline); }
    .facts { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--ink-3); font-size: 11px; }
    .description { margin: 10px 0 0; color: var(--ink-2); font-size: 12px; line-height: 1.5; }
    .customize { border-top: 1px solid var(--line); padding: 14px 16px 16px; }
    .modifier-group { margin: 0 0 14px; padding: 0; border: 0; }
    .modifier-group legend { display: flex; width: 100%; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .06em; }
    .group-rule { color: var(--ink-3); font: 500 10px/1.3 var(--font-code); letter-spacing: 0; text-transform: none; }
    .modifier-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .modifier-button { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 34px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink-2); font: 500 11.5px/1.3 var(--font-body); text-align: left; cursor: pointer; }
    .modifier-button:hover { background: var(--hover); color: var(--ink); }
    .modifier-button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }
    .modifier-button.is-selected { border-color: var(--signal); background: var(--signal-tint); color: var(--signal-ink); }
    .modifier-button span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .modifier-button span:last-child { flex-shrink: 0; color: var(--ink-3); font-size: 10px; }
    .instructions-label { display: block; margin-bottom: 6px; color: var(--ink-3); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
    textarea { width: 100%; min-height: 58px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; background: var(--field); color: var(--ink); padding: 8px 9px; font: 400 12px/1.4 var(--font-body); }
    textarea:focus { border-color: var(--line-strong); outline: none; }
    .purchase-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .quantity { display: flex; height: 34px; align-items: center; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
    .quantity button { width: 30px; height: 32px; border: 0; background: transparent; color: var(--ink-2); cursor: pointer; font-size: 16px; }
    .quantity span { width: 24px; text-align: center; font-size: 12px; font-weight: 600; }
    .add-button { min-width: 0; flex: 1; height: 34px; border: 0; border-radius: 8px; background: var(--ink); color: var(--surface); padding: 0 12px; font: 600 12px/1 var(--font-body); cursor: pointer; }
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
    const basePrice = ${scriptJson(basePrice)};
    const currency = ${scriptJson(currency)};
    const cartAvailable = ${scriptJson(cartAvailable)};
    const selected = new Set(${scriptJson(modifiers.filter((modifier: any) => modifier.defaultSelected).map((modifier: any) => modifier.id))});
    let quantity = 1;

    function money(amount) {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
        return 'Price unavailable';
      }
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
      } catch {
        return 'Price unavailable';
      }
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
      // scriptJson(undefined) is null: never coerce an unavailable source price to zero.
      const unitPrice = typeof basePrice === 'number' ? basePrice + modifierTotal : undefined;
      const total = typeof unitPrice === 'number' ? unitPrice * quantity : undefined;
      document.getElementById('quantity').textContent = String(quantity);
      document.getElementById('item-price').textContent = money(unitPrice);
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
