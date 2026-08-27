import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from './utils';
import { beautifulUIStyles, iframeAutoResizeScript } from '../ui/beautiful-ui';
import { parseStoreConfigs } from '../types/store-config';
import { getPlatformAdapter } from '../adapters';
import { getStoreLogoHue } from '@/lib/store-logo';
import {
  discoveryPlatformForTool,
  parseMarketplaceDiscoveryInput,
  productMatchesDiscoveryQuery,
  selectDiscoveryStores,
  storeMatchesDiscoveryLocation,
  type MarketplaceDiscoveryToolName,
} from '@/lib/marketplace-discovery';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

async function resolveAdapter(storeId: string, customConfig?: any[]) {
  const stores = parseStoreConfigs(customConfig);
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error(`Unknown store: ${storeId}. Available stores: ${stores.map(s => s.id).join(', ')}`);
  const adapter = await getPlatformAdapter(store);
  return { store, adapter } as const;
}



const discoveryInputProperties = {
  query: {
    type: 'string',
    maxLength: 80,
    description: 'Only the item or dish keywords, for example "t-shirt", "burger", or "vegan". Do not include location words.',
  },
  location: {
    type: 'string',
    maxLength: 80,
    description: 'Optional city, region, or country. Results are included only when a source explicitly reports matching public location metadata.',
  },
  countryCode: {
    type: 'string',
    pattern: '^[A-Za-z]{2}$',
    description: 'Optional two-letter country code for source availability and pricing, for example "ca" or "us".',
  },
  storeIds: {
    type: 'array',
    maxItems: 20,
    items: { type: 'string' },
    description: 'Optional stable source IDs returned by getAvailableStores. Every ID must belong to this tool\'s vertical.',
  },
  limit: {
    type: 'integer',
    minimum: 1,
    maximum: 24,
    description: 'Maximum matching results per source. Defaults to 10.',
  },
} as const;

export const productTools: Tool[] = [
  {
    name: 'getProduct',
    description: `Get detailed product information by ID.

IMPORTANT COUNTRY SELECTION LOGIC:
1. If countryCode is missing, call getAvailableCountries
2. Prefer "us" if available, otherwise use first country
3. Inform the user which country's pricing they're seeing`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Stable source ID returned by getAvailableStores'
        },
        productId: {
          type: 'string',
          description: 'Product ID'
        },
        countryCode: {
          type: 'string',
          description: 'Country code for pricing (e.g., "us", "ca", "gb"). Must be lowercase.'
        }
      },
      required: ['storeId', 'productId', 'countryCode']
    }
  },
  {
    name: 'discoverProducts',
    description: `Discover retail and e-commerce products only. This tool never returns restaurant menus.

Call getAvailableStores first. Pass concise item keywords in query (for example "t-shirt" or "scarf"), and pass storeIds when the user selected a particular admitted store. Omit query only when the user explicitly wants to browse all retail products. Use discoverRestaurantMenus—not this tool—for restaurants, food, dishes, takeout, or menus. Location filters fail closed when a source does not publish matching location metadata.`,
    inputSchema: {
      type: 'object',
      properties: discoveryInputProperties,
      additionalProperties: false,
      required: []
    }
  },
  {
    name: 'discoverRestaurantMenus',
    description: `Discover restaurants and orderable menu items only. This tool never returns retail or e-commerce products.

Call getAvailableStores first. Use query only for cuisine, dish, dietary, or menu keywords (for example "burger" or "vegan"). Put city/region/country text in location, not query, and use countryCode when known. Pass storeIds when the user selected a particular admitted restaurant. Omit query to browse matching restaurant menus. Location filters fail closed when a source does not explicitly publish matching public location metadata.`,
    inputSchema: {
      type: 'object',
      properties: discoveryInputProperties,
      additionalProperties: false,
      required: []
    }
  }
];

// Size ordering constant (matching OpenFront storefront)
const SIZE_ORDER: Record<string, number> = {
  "XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "XL": 6, "XXL": 7, "XXXL": 8
};

// Helper function to find the cheapest price from variants (matching OpenFront getProductPrice logic)
function getCheapestPrice(variants: any[], currencyCode: string) {
  if (!variants || variants.length === 0) return null;

  let cheapestPrice = null;
  for (const variant of variants) {
    const price = variant.prices?.find((p: any) => p.currency.code === currencyCode);
    if (price && price.calculatedPrice) {
      if (!cheapestPrice ||
          (price.calculatedPrice.calculatedAmount < cheapestPrice.calculatedPrice.calculatedAmount)) {
        cheapestPrice = price;
      }
    }
  }
  return cheapestPrice;
}

// Helper function to sort option values (matching OpenFront OptionSelect sorting)
function sortOptionValues(values: string[], optionTitle: string): string[] {
  return values.sort((a: string, b: string) => {
    if (optionTitle.toLowerCase() === "size") {
      const aOrder = SIZE_ORDER[a as keyof typeof SIZE_ORDER] || 999;
      const bOrder = SIZE_ORDER[b as keyof typeof SIZE_ORDER] || 999;
      return aOrder - bOrder;
    }
    return a.localeCompare(b);
  });
}

export async function handleProductTools(name: string, args: any, cookie: string, ctoken?: string, customConfig?: any[]) {
  if (name === 'getProduct') {
    const { storeId, productId, productHandle, countryCode } = args;

    const whereClause = productId ? { id: productId } : { handle: productHandle };
    if (!productId && !productHandle) {
      throw new Error('Either productId or productHandle is required');
    }

    const { store, adapter } = await resolveAdapter(storeId, customConfig);

    // Resolve product ID if only handle provided (platform-agnostic adapters typically key by ID)
    let resolvedProductId = productId;
    if (!resolvedProductId && productHandle) {
      const list = await adapter.searchProducts({ store, countryCode, limit: 50, cookie, ctoken });
      const hit = list.find((pp: any) => pp.handle === productHandle);
      resolvedProductId = hit?.id;
    }
    if (!resolvedProductId) {
      throw new Error('Product not found');
    }

    const p = await adapter.getProduct({ store, productId: resolvedProductId, countryCode, cookie, ctoken });

    if (adapter.generateProductUI) {
      const htmlContent = await adapter.generateProductUI({
        store,
        storeId,
        product: p,
        countryCode,
      });
      const uiResource = createUIResource({
        uri: `ui://marketplace/product/${p.id}?country=${countryCode}&store=${encodeURIComponent(storeId)}`,
        content: { type: 'rawHtml', htmlString: htmlContent },
        encoding: 'text',
      });
      return {
        jsonrpc: '2.0',
        result: { content: [uiResource] },
      };
    }

    // Map to OpenFront-shaped structure for existing UI
    const sym = (code: string) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';
    // Build product options from variant.options
    const optionNames = new Set<string>();
    const optionValuesMap: Record<string, Set<string>> = {};
    (p.variants || []).forEach((v: any) => {
      (v.options || []).forEach((o: any) => {
        const name = (o.name || '').trim();
        const value = (o.value || '').trim();
        if (!name || !value) return;
        optionNames.add(name);
        if (!optionValuesMap[name]) optionValuesMap[name] = new Set<string>();
        optionValuesMap[name].add(value);
      });
    });

    const makeOptId = (name: string) => `opt_${p.id}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    const productOptions = Array.from(optionNames).map((name) => ({
      id: makeOptId(name),
      title: name,
      productOptionValues: Array.from(optionValuesMap[name] || new Set()).map((val) => ({ id: `${makeOptId(name)}_${val}`, value: val }))
    }));

    const product = {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description || '',
      thumbnail: p.thumbnail,
      productImages: [],
      productOptions,
      productVariants: (p.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        inventoryQuantity: v.inventoryQuantity,
        allowBackorder: v.allowBackorder || false,
        primaryImage: null,
        prices: [{ id: 'price', amount: v.price, currency: { code: v.currency, symbol: sym(v.currency) }, calculatedPrice: { calculatedAmount: v.price, originalAmount: v.price, currencyCode: v.currency } }],
        productOptionValues: (v.options || []).map((o: any) => ({ value: o.value, productOption: { id: makeOptId(o.name) } }))
      })),
    } as any;

    // Wrap single product in array for UI generation
    const products = [product];

    // Generate horizontal product detail UI for getProduct
    const productsHTML = products.map((product: any, index: number) => {
      // Get currency code from first variant with prices
      const currencyCode = product.productVariants?.find((v: any) => v.prices?.length > 0)?.prices?.[0]?.currency?.code || 'USD';
      const currencySymbol = product.productVariants?.find((v: any) => v.prices?.length > 0)?.prices?.[0]?.currency?.symbol || '$';

      // Get cheapest price across all variants (matching OpenFront getProductPrice logic)
      const cheapestPriceObj = getCheapestPrice(product.productVariants, currencyCode);
      const formattedPrice = cheapestPriceObj ?
        `${currencySymbol}${(cheapestPriceObj.calculatedPrice?.calculatedAmount / 100).toFixed(2)}` :
        'Price unavailable';

      const hasMultipleVariants = product.productVariants?.length > 1;

      // Build option buttons UI (matching OptionSelect component from storefront)
      let optionsHTML = '';
      if (hasMultipleVariants && product.productOptions?.length > 0) {
        optionsHTML = product.productOptions.map((option: any) => {
          // Get unique values and sort them properly (matching OpenFront OptionSelect)
          const uniqueValues = option.productOptionValues
            .map((v: any) => v.value)
            .filter((value: any, idx: number, self: any[]) => self.indexOf(value) === idx);
          const values = sortOptionValues(uniqueValues, option.title);

          return `
            <div class="flex flex-col gap-y-1.5 mb-2">
              <span class="option-label text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-500">${option.title}</span>
              <div class="flex flex-wrap gap-1.5">
                ${values.map((value: string) => {
                  // Escape for HTML attribute
                  const htmlEscaped = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  return `
                  <button
                    class="option-btn inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
                           ring-1 ring-inset ring-gray-300 text-gray-700 bg-white
                           transition-all"
                    data-product-index="${index}"
                    data-option-id="${option.id}"
                    data-value="${htmlEscaped}"
                    aria-pressed="false"
                    onclick="handleOptionClick(this)"
                  >
                    ${value}
                  </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      }

      // Prepare product images for carousel (sort by order field, matching OpenFront ImageGallery)
      const productImages = product.productImages?.length > 0
        ? [...product.productImages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        : (product.thumbnail ? [{ id: 'thumb', image: { url: product.thumbnail }, altText: product.title }] : []);

      const hasImages = productImages.length > 0;

      // Horizontal layout: image left, details right, description below
      return `
        <div class="product-card border rounded-lg bg-white overflow-hidden" data-product-index="${index}">
          <!-- Top section: Image + Details side by side on desktop, stacked on mobile -->
          <div class="flex flex-col sm:flex-row">
            <!-- Image section -->
            <div class="sm:w-40 md:w-48 flex-shrink-0">
              ${hasImages ? `
                <div class="relative w-full aspect-square sm:h-full bg-gray-100 overflow-hidden group">
                  <div class="carousel-container h-full" data-product-index="${index}">
                    ${productImages.map((img: any, imgIdx: number) => `
                      <img
                        src="${img.image?.url || img.imagePath || '/images/placeholder.svg'}"
                        alt="${img.altText || product.title}"
                        class="carousel-image w-full h-full object-cover sm:object-contain object-center absolute inset-0 transition-opacity duration-300"
                        data-image-id="${img.id}"
                        data-product-index="${index}"
                        data-image-index="${imgIdx}"
                        style="opacity: ${imgIdx === 0 ? '1' : '0'};"
                      />
                    `).join('')}
                  </div>
                  ${productImages.length > 1 ? `
                    <button
                      class="carousel-prev absolute left-1.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      data-product-index="${index}"
                      onclick="handleCarouselPrev(this)"
                      aria-label="Previous image"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    <button
                      class="carousel-next absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      data-product-index="${index}"
                      onclick="handleCarouselNext(this)"
                      aria-label="Next image"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                    <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      ${productImages.map((_: any, imgIdx: number) => `
                        <div class="carousel-dot w-1.5 h-1.5 rounded-full transition-colors ${imgIdx === 0 ? 'bg-white' : 'bg-white/50'}" data-product-index="${index}" data-dot-index="${imgIdx}"></div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div class="w-full aspect-square sm:h-full bg-gray-200 flex items-center justify-center">
                  <span class="text-gray-400 text-sm">No image</span>
                </div>
              `}
            </div>

            <!-- Details section -->
            <div class="flex-1 p-3 sm:p-4 flex flex-col">
              <h3 class="font-semibold text-base sm:text-lg text-gray-900 mb-1">${product.title}</h3>
              
              <p class="price-display text-lg sm:text-xl font-bold text-gray-900 mb-3" data-product-index="${index}">
                ${formattedPrice}
              </p>

              ${optionsHTML}

              <button
                class="add-to-cart-btn w-full sm:w-auto sm:px-6 h-9 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-auto"
                data-product-index="${index}"
                onclick="handleAddToCart(this)"
                ${hasMultipleVariants ? 'disabled' : ''}>
                ${hasMultipleVariants ? 'Select variant' : 'Add to cart'}
              </button>
            </div>
          </div>

          <!-- Description section below -->
          ${product.description ? `
            <div class="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-gray-100">
              <p class="text-sm text-gray-600 pt-3">${product.description}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          ${beautifulUIStyles}
          button { cursor: pointer; }
          button:hover { transform: translateY(-1px); }

          /* Hover styles for option buttons */
          .option-btn.bg-white:hover {
            background-color: rgb(249 250 251); /* gray-50 */
          }
          .option-btn.bg-gray-900:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
        ${productsHTML}
        <script>

          ${iframeAutoResizeScript}

          // Store product data for JavaScript access
          const productsData = ${JSON.stringify(products)};
          const selectedOptions = {};


          // Simple deep equality check (matching lodash isEqual behavior)
          function isEqual(obj1, obj2) {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            if (keys1.length !== keys2.length) return false;
            for (const key of keys1) {
              if (obj1[key] !== obj2[key]) return false;
            }
            return true;
          }

          // Initialize selected options for each product (with undefined for unselected)
          productsData.forEach((product, index) => {
            const optionObj = {};
            for (const option of product.productOptions || []) {
              optionObj[option.id] = undefined;
            }
            selectedOptions[index] = optionObj;
          });


          // Build variant record (maps variant ID to option selections)
          const variantRecords = productsData.map(product => {
            const map = {};
            for (const variant of product.productVariants || []) {
              if (!variant.productOptionValues?.length || !variant.id) continue;
              const temp = {};
              for (const optionValue of variant.productOptionValues) {
                if (optionValue.productOption?.id && optionValue.value) {
                  temp[optionValue.productOption.id] = optionValue.value;
                }
              }
              map[variant.id] = temp;
            }
            return map;
          });


          // Handler for option button clicks - reads from data attributes
          function handleOptionClick(button) {
            const productIndex = parseInt(button.dataset.productIndex);
            const optionId = button.dataset.optionId;
            const value = button.dataset.value;


            selectedOptions[productIndex] = { ...selectedOptions[productIndex], [optionId]: value };

            updateProductUI(productIndex);
          }

          // Make it global so onclick can access it
          window.handleOptionClick = handleOptionClick;

          // Find variant using isEqual comparison (matching openfront logic)
          function findMatchingVariant(productIndex) {
            const product = productsData[productIndex];
            const selected = selectedOptions[productIndex];
            const variants = product.productVariants || [];
            const variantRecord = variantRecords[productIndex];

            // Check if single variant
            if (variants.length === 1) {
              return variants[0];
            }

            // Find variant by comparing option objects with isEqual
            let variantId = undefined;
            for (const key of Object.keys(variantRecord)) {
              if (isEqual(variantRecord[key], selected)) {
                variantId = key;
                break;
              }
            }

            return variants.find(v => v.id === variantId);
          }

          // Update product UI based on selected options
          function updateProductUI(productIndex) {
            const product = productsData[productIndex];
            const selected = selectedOptions[productIndex];
            const matchingVariant = findMatchingVariant(productIndex);

            // Update option button styles
            const card = document.querySelector('.product-card[data-product-index="' + productIndex + '"]');
            const optionButtons = card.querySelectorAll('.option-btn');

            optionButtons.forEach(btn => {
              const optionId = btn.dataset.optionId;
              const value = btn.dataset.value;
              const isSelected = selected[optionId] === value;

              btn.classList.toggle('is-selected', isSelected);
              btn.setAttribute('aria-pressed', String(isSelected));
            });

            // Update price
            const priceDisplay = card.querySelector('.price-display');
            if (matchingVariant?.prices?.[0]) {
              const price = matchingVariant.prices[0];
              const amount = price.calculatedPrice?.calculatedAmount || price.amount;
              const formattedPrice = price.currency.symbol + (amount / 100).toFixed(2);
              priceDisplay.textContent = formattedPrice;
            }

            // Update carousel to show variant's primary image (matching OpenFront ImageGallery logic)
            if (matchingVariant?.primaryImage?.id) {
              const images = card.querySelectorAll('.carousel-image');
              const dots = card.querySelectorAll('.carousel-dot');

              // Find the index of the variant's primary image
              let targetImageIndex = -1;
              images.forEach((img, idx) => {
                if (img.dataset.imageId === matchingVariant.primaryImage.id) {
                  targetImageIndex = idx;
                }
              });

              // If found, switch to that image
              if (targetImageIndex >= 0 && targetImageIndex !== carouselState[productIndex]) {
                // Hide current image
                if (images[carouselState[productIndex]]) {
                  images[carouselState[productIndex]].style.opacity = '0';
                  if (dots[carouselState[productIndex]]) {
                    dots[carouselState[productIndex]].classList.remove('bg-white');
                    dots[carouselState[productIndex]].classList.add('bg-white/50');
                  }
                }

                // Update state and show new image
                carouselState[productIndex] = targetImageIndex;
                images[targetImageIndex].style.opacity = '1';
                if (dots[targetImageIndex]) {
                  dots[targetImageIndex].classList.remove('bg-white/50');
                  dots[targetImageIndex].classList.add('bg-white');
                }

              }
            }

            // Update button state
            const addToCartBtn = card.querySelector('.add-to-cart-btn');
            const hasAllOptions = Object.values(selected).every(v => v !== undefined);

            if (matchingVariant) {
              const inStock = (matchingVariant.inventoryQuantity > 0) || matchingVariant.allowBackorder;
              addToCartBtn.disabled = !inStock;
              addToCartBtn.textContent = inStock ? 'Add to cart' : 'Out of stock';
            } else {
              addToCartBtn.disabled = true;
              addToCartBtn.textContent = hasAllOptions ? 'Unavailable' : 'Select variant';
            }
          }

          // Handler for add to cart button clicks - reads from data attributes
          function handleAddToCart(button) {
            const productIndex = parseInt(button.dataset.productIndex);

            const product = productsData[productIndex];
            const matchingVariant = findMatchingVariant(productIndex);

            if (!matchingVariant) {
              return;
            }

            // Send addToCart tool call
            window.parent.postMessage({
              type: 'tool',
              messageId: 'add-to-cart-' + Date.now(),
              payload: {
                toolName: 'addToCart',
                params: {
                  storeId: ${JSON.stringify(storeId)},
                  variantId: matchingVariant.id,
                  quantity: 1,
                  countryCode: ${JSON.stringify(countryCode)}
                }
              }
            }, '*');
          }

          // Make it global so onclick can access it
          window.handleAddToCart = handleAddToCart;

          // Track current image index for each product carousel
          const carouselState = {};
          productsData.forEach((_, index) => {
            carouselState[index] = 0; // Start at first image
          });

          // Carousel navigation functions
          function handleCarouselPrev(button) {
            const productIndex = parseInt(button.dataset.productIndex);
            const card = document.querySelector('.product-card[data-product-index="' + productIndex + '"]');
            const images = card.querySelectorAll('.carousel-image');
            const dots = card.querySelectorAll('.carousel-dot');

            if (images.length <= 1) return;

            // Hide current image
            images[carouselState[productIndex]].style.opacity = '0';
            dots[carouselState[productIndex]].classList.remove('bg-white');
            dots[carouselState[productIndex]].classList.add('bg-white/50');

            // Move to previous image (wrap around)
            carouselState[productIndex] = (carouselState[productIndex] - 1 + images.length) % images.length;

            // Show new image
            images[carouselState[productIndex]].style.opacity = '1';
            dots[carouselState[productIndex]].classList.remove('bg-white/50');
            dots[carouselState[productIndex]].classList.add('bg-white');
          }

          function handleCarouselNext(button) {
            const productIndex = parseInt(button.dataset.productIndex);
            const card = document.querySelector('.product-card[data-product-index="' + productIndex + '"]');
            const images = card.querySelectorAll('.carousel-image');
            const dots = card.querySelectorAll('.carousel-dot');

            if (images.length <= 1) return;

            // Hide current image
            images[carouselState[productIndex]].style.opacity = '0';
            dots[carouselState[productIndex]].classList.remove('bg-white');
            dots[carouselState[productIndex]].classList.add('bg-white/50');

            // Move to next image (wrap around)
            carouselState[productIndex] = (carouselState[productIndex] + 1) % images.length;

            // Show new image
            images[carouselState[productIndex]].style.opacity = '1';
            dots[carouselState[productIndex]].classList.remove('bg-white/50');
            dots[carouselState[productIndex]].classList.add('bg-white');
          }

          // Make carousel functions global
          window.handleCarouselPrev = handleCarouselPrev;
          window.handleCarouselNext = handleCarouselNext;

        </script>
      </body>
      </html>
    `;

    // Use proper MCP UI format
    const uiResource = createUIResource({
      uri: `ui://marketplace/product/${product.id}?country=${countryCode}&store=${encodeURIComponent(storeId)}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  if (name === 'discoverProducts' || name === 'discoverRestaurantMenus') {
    const toolName = name as MarketplaceDiscoveryToolName;
    const discovery = parseMarketplaceDiscoveryInput(args);
    const configuredStores = parseStoreConfigs(customConfig);
    const stores = selectDiscoveryStores(configuredStores, toolName, discovery);
    const vertical = discoveryPlatformForTool(toolName) === 'openfront-restaurant'
      ? 'restaurant'
      : 'retail';

    if (stores.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              stores: [],
              totalStores: 0,
              vertical,
              message: `No admitted ${vertical} sources match this request.`,
            }),
          }]
        }
      };
    }

    // Resolve public store/location metadata before fetching a bounded product set.
    const storeDataPromises = stores.map(async (storeConfig) => {
      try {
        const { store, adapter } = await resolveAdapter(storeConfig.id, customConfig);

        const [storeInfo, countries] = await Promise.all([
          adapter.getStoreInfo({ store, cookie, ctoken }),
          adapter.getAvailableCountries({ store, cookie, ctoken }),
        ]);

        if (!storeMatchesDiscoveryLocation(storeInfo, countries, discovery.location)) {
          return null;
        }

        const selectedCountry = discovery.countryCode
          ? countries.find((country: any) => country.code?.toLowerCase() === discovery.countryCode)
          : countries.find((country: any) => country.code?.toLowerCase() === 'us') || countries[0];
        if (!selectedCountry) return null;

        // Fetch enough public results to apply keyword matching locally without
        // interpolating model-provided search text into a source query.
        const sourceLimit = discovery.query ? 50 : discovery.limit;
        const adapterProducts = await adapter.searchProducts({
          store,
          countryCode: selectedCountry.code,
          limit: sourceLimit,
          cookie,
          ctoken,
        });
        const sym = (code: string) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';
        const products = adapterProducts
          .filter((product) => productMatchesDiscoveryQuery(product, discovery.query))
          .slice(0, discovery.limit)
          .map((p: any) => {
          const optionNames = new Set<string>();
          const optionValuesMap: Record<string, Set<string>> = {};
          (p.variants || []).forEach((v: any) => {
            (v.options || []).forEach((o: any) => {
              const name = (o.name || '').trim();
              const value = (o.value || '').trim();
              if (!name || !value) return;
              optionNames.add(name);
              if (!optionValuesMap[name]) optionValuesMap[name] = new Set<string>();
              optionValuesMap[name].add(value);
            });
          });

          const makeOptId = (name: string) => `opt_${p.id}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

          const productOptions = Array.from(optionNames).map((name) => ({
            id: makeOptId(name),
            title: name,
            productOptionValues: Array.from(optionValuesMap[name] || new Set()).map((val) => ({ id: `${makeOptId(name)}_${val}`, value: val }))
          }));

          const productVariants = (p.variants || []).map((v: any) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            inventoryQuantity: v.inventoryQuantity,
            allowBackorder: v.allowBackorder || false,
            primaryImage: null,
            prices: [{ id: 'price', amount: v.price, currency: { code: v.currency, symbol: sym(v.currency) }, calculatedPrice: { calculatedAmount: v.price, originalAmount: v.price, currencyCode: v.currency } }],
            productOptionValues: (v.options || []).map((o: any) => ({ value: o.value, productOption: { id: makeOptId(o.name) } }))
          }));

          return {
            id: p.id,
            title: p.title,
            handle: p.handle,
            thumbnail: p.thumbnail,
            productImages: [],
            productOptions,
            productVariants,
            metadata: p.metadata,
          };
        });

        if (products.length === 0) return null;

        return {
          storeName: storeInfo?.name || 'Unknown Store',
          storeId: store.id,
          platform: store.platform,
          country: { code: selectedCountry.code, name: selectedCountry.name, currency: { code: selectedCountry.currency, symbol: sym(selectedCountry.currency) } },
          products,
          logoIcon: storeInfo?.logoIcon,
          logoColor: storeInfo?.logoColor,
          address: storeInfo?.address,
        };
      } catch (error) {
        console.error(`Failed to fetch products from ${storeConfig.id}:`, error);
        return null;
      }
    });

    const storesData = (await Promise.all(storeDataPromises)).filter(
      (storeData): storeData is NonNullable<typeof storeData> => storeData !== null
    );

    if (storesData.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              stores: [],
              totalStores: 0,
              vertical,
              ...(discovery.query ? { query: discovery.query } : {}),
              ...(discovery.location ? { location: discovery.location } : {}),
              message: `No ${vertical} results matched the requested items, location, and country.`,
            }),
          }]
        }
      };
    }

    const discoveryTitle = vertical === 'restaurant'
      ? discovery.query ? `Restaurant menus · ${discovery.query}` : 'Restaurant menus'
      : discovery.query ? `Products · ${discovery.query}` : 'Retail products';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          ${beautifulUIStyles}
          .discover-shell {
            overflow: hidden;
            border-radius: 12px;
            background: var(--surface);
            box-shadow: var(--shadow-card);
          }
          .discover-shell > .discover-title {
            margin: 0 !important;
            padding: 11px 12px !important;
            border-bottom: 1px solid var(--line);
            border-radius: 0 !important;
            background: var(--surface) !important;
            color: var(--ink) !important;
            font-size: 15px !important;
            font-weight: 650 !important;
            line-height: 1.35;
            box-shadow: none !important;
          }
          .discover-shell .store-section {
            margin: 0;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .discover-shell .store-section + .store-section {
            border-top: 1px solid var(--line) !important;
          }
          .discover-shell .product-card {
            border-radius: 10px !important;
            box-shadow: var(--shadow-card) !important;
          }
          .discover-shell .product-card img,
          .discover-shell .product-card .bg-gray-100,
          .discover-shell .product-card .bg-gray-200 {
            border-radius: 8px !important;
          }
          .discover-shell .restaurant-card h3 {
            margin-bottom: 5px !important;
            color: var(--ink) !important;
            font-size: 16px !important;
            font-weight: 680 !important;
            line-height: 1.2 !important;
            letter-spacing: -.02em;
          }
          .discover-shell .restaurant-card img { object-fit: cover !important; }
          .restaurant-category {
            margin: 0 0 5px;
            color: var(--ink-3);
            font-size: 9.5px;
            font-weight: 650;
            letter-spacing: .08em;
            line-height: 1.2;
            text-transform: uppercase;
          }
          .discover-shell .restaurant-price {
            align-self: flex-start;
            margin: 2px 0 11px !important;
            border-radius: 6px;
            background: var(--inset);
            padding: 4px 7px;
            color: var(--ink-2) !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 12px !important;
            font-weight: 600 !important;
            font-variant-numeric: tabular-nums;
            line-height: 1;
            box-shadow: var(--shadow-hairline);
          }
          .discover-shell .store-logo {
            overflow: hidden;
          }
          .discover-shell .store-logo > svg {
            display: block;
            width: 100%;
            height: 100%;
          }
          /* Horizontal scroll container */
          .horizontal-scroll {
            overflow-x: auto;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: var(--line-strong) transparent;
          }
          .horizontal-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .horizontal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .horizontal-scroll::-webkit-scrollbar-thumb {
            background: var(--line-strong);
            border-radius: 999px;
          }
          .horizontal-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--ink-3);
          }
        </style>
      </head>
      <body>
        <div class="discover-shell">
          <h1 class="discover-title">${escapeHtml(discoveryTitle)}</h1>

          ${storesData.map((storeData, storeIndex) => {
            const productCardsHTML = storeData.products.map((product: any, productIndex: number) => {
              // Use the same helper functions from searchProducts
              const currencyCode = product.productVariants?.find((v: any) => v.prices?.length > 0)?.prices?.[0]?.currency?.code || storeData.country.currency.code;
              const currencySymbol = product.productVariants?.find((v: any) => v.prices?.length > 0)?.prices?.[0]?.currency?.symbol || storeData.country.currency.symbol;

              const cheapestPriceObj = getCheapestPrice(product.productVariants, currencyCode);
              const formattedPrice = cheapestPriceObj ?
                `${currencySymbol}${(cheapestPriceObj.calculatedPrice?.calculatedAmount / 100).toFixed(2)}` :
                'Price unavailable';

              const hasMultipleVariants = product.productVariants?.length > 1;
              const isRestaurant = product.metadata?.vertical === 'restaurant';
              const restaurantCartAvailable = !isRestaurant || product.metadata?.restaurant?.cartAvailable !== false;
              const requiresCustomization = restaurantCartAvailable && isRestaurant && (product.metadata?.restaurant?.modifiers?.length || 0) > 0;

              // Product images carousel
              const productImages = product.productImages?.length > 0
                ? [...product.productImages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                : (product.thumbnail ? [{ id: 'thumb', image: { url: product.thumbnail }, altText: product.title }] : []);

              const hasImages = productImages.length > 0;

              // Product options
              let optionsHTML = '';
              if (hasMultipleVariants && product.productOptions?.length > 0) {
                optionsHTML = product.productOptions.map((option: any) => {
                  const uniqueValues = option.productOptionValues
                    .map((v: any) => v.value)
                    .filter((value: any, idx: number, self: any[]) => self.indexOf(value) === idx);
                  const values = sortOptionValues(uniqueValues, option.title);

                  return `
                    <div class="flex flex-col gap-y-2 mb-3">
                      <span class="option-label text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-500">${option.title}</span>
                      <div class="flex flex-wrap gap-2">
                        ${values.map((value: string) => {
                          const htmlEscaped = value.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                          return `
                            <button
                              class="option-btn text-xs px-2 py-1 rounded-lg transition-all border ring-gray-300 text-gray-700 bg-white hover:ring-gray-400"
                              data-product-index="${storeIndex}-${productIndex}"
                              data-store-index="${storeIndex}"
                              data-option-id="${option.id}"
                              data-value="${htmlEscaped}"
                              aria-pressed="false"
                              onclick="handleOptionClick(this)"
                            >
                              ${value}
                            </button>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('');
              }

              return `
                <div class="product-card${isRestaurant ? ' restaurant-card' : ''} flex-shrink-0 w-48 sm:w-72 p-2 sm:p-3.5 bg-white self-start"
                     data-product-index="${storeIndex}-${productIndex}"
                     data-store-index="${storeIndex}">
                  ${hasImages ? `
                    <div class="relative w-full aspect-square bg-gray-100 mb-1.5 sm:mb-3 overflow-hidden group">
                      <div class="carousel-container" data-product-index="${storeIndex}-${productIndex}">
                        ${productImages.map((img: any, imgIdx: number) => `
                          <img
                            src="${img.image?.url || img.imagePath || '/images/placeholder.svg'}"
                            alt="${img.altText || product.title}"
                            class="carousel-image w-full h-full object-contain object-center absolute inset-0 transition-opacity duration-300"
                            data-image-id="${img.id}"
                            data-product-index="${storeIndex}-${productIndex}"
                            data-image-index="${imgIdx}"
                            style="opacity: ${imgIdx === 0 ? '1' : '0'};"
                          />
                        `).join('')}
                      </div>
                      ${productImages.length > 1 ? `
                        <button
                          class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                          data-product-index="${storeIndex}-${productIndex}"
                          onclick="handleCarouselPrev(this)"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                          </svg>
                        </button>
                        <button
                          class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                          data-product-index="${storeIndex}-${productIndex}"
                          onclick="handleCarouselNext(this)"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                          ${productImages.map((_: any, imgIdx: number) => `
                            <div class="carousel-dot w-1.5 h-1.5 rounded-full transition-colors ${imgIdx === 0 ? 'bg-white' : 'bg-white/50'}"
                                 data-product-index="${storeIndex}-${productIndex}"
                                 data-dot-index="${imgIdx}"></div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  ` : `
                    <div class="w-full h-28 sm:h-48 bg-gray-200 mb-1.5 sm:mb-3 flex items-center justify-center">
                      <span class="text-gray-400 text-sm">No image</span>
                    </div>
                  `}

                  <div class="flex flex-col">
                    ${isRestaurant && product.metadata?.restaurant?.category?.name
                      ? `<p class="restaurant-category">${escapeHtml(product.metadata.restaurant.category.name)}</p>`
                      : ''}
                    <h3 class="font-semibold text-sm sm:text-lg text-gray-900 mb-1 sm:mb-2 line-clamp-2">${escapeHtml(product.title)}</h3>
                    ${optionsHTML}
                    <p class="price-display${isRestaurant ? ' restaurant-price' : ''} text-base sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" data-product-index="${storeIndex}-${productIndex}">
                      ${formattedPrice}
                    </p>
                    <button
                      class="add-to-cart-btn w-full h-8 sm:h-10 px-3 sm:px-4 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      data-product-index="${storeIndex}-${productIndex}"
                      data-store-index="${storeIndex}"
                      onclick="${!restaurantCartAvailable || requiresCustomization ? 'handleViewDetails' : 'handleAddToCart'}(this)"
                      ${hasMultipleVariants || !restaurantCartAvailable ? 'disabled' : ''}
                      ${!restaurantCartAvailable ? 'title="Marketplace ordering is not available for this restaurant yet"' : ''}>
                      ${!restaurantCartAvailable ? 'Cart unavailable' : requiresCustomization ? 'Customize' : hasMultipleVariants ? 'Select variant' : 'Add to cart'}
                    </button>
                    <button
                      class="w-full h-8 sm:h-10 px-3 sm:px-4 mt-2 border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                      data-product-index="${storeIndex}-${productIndex}"
                      data-store-index="${storeIndex}"
                      onclick="handleViewDetails(this)">
                      View Details
                    </button>
                  </div>
                </div>
              `;
            }).join('');

            return `
              <div class="store-section bg-gray-50">
                <div class="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 pt-2 sm:pt-4">
                  ${storeData.logoIcon ? `
                    <div class="store-logo flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center"
                         style="filter: hue-rotate(${getStoreLogoHue(storeData.logoColor)}deg);">
                      ${storeData.logoIcon}
                    </div>
                  ` : ''}
                  <div>
                    <h2 class="text-base sm:text-xl font-bold text-gray-900">${storeData.storeName}</h2>
                    <p class="text-xs sm:text-sm text-gray-500">${storeData.platform === 'openfront-restaurant'
                      ? `Menu • ${storeData.country.currency.code}`
                      : `Products in ${storeData.country.name} • ${storeData.country.currency.code}`}</p>
                  </div>
                </div>

                <div class="horizontal-scroll flex gap-2 sm:gap-4 p-2 sm:p-4">
                  ${productCardsHTML}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <script>
          ${iframeAutoResizeScript}

          const storesData = ${JSON.stringify(storesData)};
          const selectedOptions = {};
          const carouselState = {};

          // Initialize state for each product
          storesData.forEach((store, storeIndex) => {
            store.products.forEach((product, productIndex) => {
              const key = \`\${storeIndex}-\${productIndex}\`;
              const optionObj = {};
              for (const option of product.productOptions || []) {
                optionObj[option.id] = undefined;
              }
              selectedOptions[key] = optionObj;
              carouselState[key] = 0;

              // Initialize with the variant values when no choice is required.
              if (product.productVariants?.length === 1) {
                product.productVariants[0].productOptionValues?.forEach(optVal => {
                  selectedOptions[key][optVal.productOption.id] = optVal.value;
                });
              }
            });
          });

          // Carousel functions (same as searchProducts)
          function handleCarouselPrev(button) {
            const productKey = button.dataset.productIndex;
            const card = document.querySelector('.product-card[data-product-index="' + productKey + '"]');
            const images = card.querySelectorAll('.carousel-image');
            const dots = card.querySelectorAll('.carousel-dot');

            if (images.length <= 1) return;

            images[carouselState[productKey]].style.opacity = '0';
            dots[carouselState[productKey]].classList.remove('bg-white');
            dots[carouselState[productKey]].classList.add('bg-white/50');

            carouselState[productKey] = (carouselState[productKey] - 1 + images.length) % images.length;

            images[carouselState[productKey]].style.opacity = '1';
            dots[carouselState[productKey]].classList.remove('bg-white/50');
            dots[carouselState[productKey]].classList.add('bg-white');
          }

          function handleCarouselNext(button) {
            const productKey = button.dataset.productIndex;
            const card = document.querySelector('.product-card[data-product-index="' + productKey + '"]');
            const images = card.querySelectorAll('.carousel-image');
            const dots = card.querySelectorAll('.carousel-dot');

            if (images.length <= 1) return;

            images[carouselState[productKey]].style.opacity = '0';
            dots[carouselState[productKey]].classList.remove('bg-white');
            dots[carouselState[productKey]].classList.add('bg-white/50');

            carouselState[productKey] = (carouselState[productKey] + 1) % images.length;

            images[carouselState[productKey]].style.opacity = '1';
            dots[carouselState[productKey]].classList.remove('bg-white/50');
            dots[carouselState[productKey]].classList.add('bg-white');
          }

          function handleOptionClick(button) {
            const productKey = button.dataset.productIndex;
            const storeIndex = parseInt(button.dataset.storeIndex);
            const optionId = button.dataset.optionId;
            const value = button.dataset.value;

            selectedOptions[productKey][optionId] = value;
            updateProductUI(productKey, storeIndex);
          }

          function findMatchingVariant(productKey, storeIndex) {
            const [storeIdx, productIdx] = productKey.split('-').map(Number);
            const product = storesData[storeIdx].products[productIdx];
            const selected = selectedOptions[productKey];

            if (!product.productVariants || product.productVariants.length === 0) return null;
            if (product.productVariants.length === 1) return product.productVariants[0];

            const requiredOptions = product.productOptions || [];
            if (requiredOptions.some(option => selected[option.id] === undefined)) return null;

            const variantRecord = {};
            product.productVariants.forEach(v => {
              const optionValues = {};
              v.productOptionValues?.forEach(pov => {
                optionValues[pov.productOption.id] = pov.value;
              });
              variantRecord[v.id] = optionValues;
            });

            for (const key of Object.keys(variantRecord)) {
              const isMatch = requiredOptions.every(option =>
                variantRecord[key][option.id] === selected[option.id]
              );
              if (isMatch) return product.productVariants.find(v => v.id === key);
            }
            return null;
          }

          function updateProductUI(productKey, storeIndex) {
            const [storeIdx, productIdx] = productKey.split('-').map(Number);
            const product = storesData[storeIdx].products[productIdx];
            const selected = selectedOptions[productKey];
            const matchingVariant = findMatchingVariant(productKey, storeIndex);

            const card = document.querySelector('.product-card[data-product-index="' + productKey + '"]');
            const optionButtons = card.querySelectorAll('.option-btn');

            optionButtons.forEach(btn => {
              const optionId = btn.dataset.optionId;
              const value = btn.dataset.value;
              const isSelected = selected[optionId] === value;

              btn.classList.toggle('is-selected', isSelected);
              btn.setAttribute('aria-pressed', String(isSelected));
            });

            const priceDisplay = card.querySelector('.price-display');
            if (matchingVariant?.prices?.[0]) {
              const price = matchingVariant.prices[0];
              const amount = price.calculatedPrice?.calculatedAmount || price.amount;
              const formattedPrice = price.currency.symbol + (amount / 100).toFixed(2);
              priceDisplay.textContent = formattedPrice;
            }

            // Update carousel for variant image
            if (matchingVariant?.primaryImage?.id) {
              const images = card.querySelectorAll('.carousel-image');
              const dots = card.querySelectorAll('.carousel-dot');

              let targetImageIndex = -1;
              images.forEach((img, idx) => {
                if (img.dataset.imageId === matchingVariant.primaryImage.id) {
                  targetImageIndex = idx;
                }
              });

              if (targetImageIndex >= 0 && targetImageIndex !== carouselState[productKey]) {
                if (images[carouselState[productKey]]) {
                  images[carouselState[productKey]].style.opacity = '0';
                  if (dots[carouselState[productKey]]) {
                    dots[carouselState[productKey]].classList.remove('bg-white');
                    dots[carouselState[productKey]].classList.add('bg-white/50');
                  }
                }

                carouselState[productKey] = targetImageIndex;
                images[targetImageIndex].style.opacity = '1';
                if (dots[targetImageIndex]) {
                  dots[targetImageIndex].classList.remove('bg-white/50');
                  dots[targetImageIndex].classList.add('bg-white');
                }
              }
            }

            const addToCartBtn = card.querySelector('.add-to-cart-btn');
            const hasAllOptions = Object.values(selected).every(v => v !== undefined);

            if (matchingVariant) {
              const inStock = (matchingVariant.inventoryQuantity > 0) || matchingVariant.allowBackorder;
              addToCartBtn.disabled = !inStock;
              addToCartBtn.textContent = inStock ? 'Add to cart' : 'Out of stock';
            } else {
              addToCartBtn.disabled = true;
              addToCartBtn.textContent = hasAllOptions ? 'Unavailable' : 'Select variant';
            }
          }

          function handleAddToCart(button) {
            const productKey = button.dataset.productIndex;
            const storeIndex = parseInt(button.dataset.storeIndex);
            const [storeIdx, productIdx] = productKey.split('-').map(Number);
            const product = storesData[storeIdx].products[productIdx];
            const store = storesData[storeIdx];
            const matchingVariant = findMatchingVariant(productKey, storeIndex);

            if (!matchingVariant) return;

            // Send addToCart tool call
            window.parent.postMessage({
              type: 'tool',
              messageId: 'add-to-cart-' + Date.now(),
              payload: {
                toolName: 'addToCart',
                params: {
                  storeId: store.storeId,
                  variantId: matchingVariant.id,
                  quantity: 1,
                  countryCode: store.country.code
                }
              }
            }, '*');
          }

          function handleViewDetails(button) {
            const productKey = button.dataset.productIndex;
            const [storeIdx, productIdx] = productKey.split('-').map(Number);
            const product = storesData[storeIdx].products[productIdx];
            const store = storesData[storeIdx];

            // Send getProduct tool call to show full product details
            window.parent.postMessage({
              type: 'tool',
              messageId: 'get-product-' + Date.now(),
              payload: {
                toolName: 'getProduct',
                params: {
                  storeId: store.storeId,
                  productId: product.id,
                  countryCode: store.country.code
                }
              }
            }, '*');
          }

          window.handleCarouselPrev = handleCarouselPrev;
          window.handleCarouselNext = handleCarouselNext;
          window.handleOptionClick = handleOptionClick;
          window.handleAddToCart = handleAddToCart;
          window.handleViewDetails = handleViewDetails;
        </script>
      </body>
      </html>
    `;

    const resourceParams = new URLSearchParams({ vertical });
    storesData.forEach((storeData) => resourceParams.append('store', storeData.storeId));
    if (discovery.query) resourceParams.set('query', discovery.query);

    const uiResource = createUIResource({
      uri: `ui://marketplace/discover-products?${resourceParams.toString()}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource],
      }
    };
  }

  throw new Error(`Product tool ${name} not found`);
}