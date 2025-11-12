import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from './utils';
import { parseStoreConfigs } from '../types/store-config';
import { getPlatformAdapter } from '../adapters';

async function resolveAdapter(storeId: string, customConfig?: any[]) {
  const stores = parseStoreConfigs(customConfig);
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error(`Unknown store: ${storeId}. Available stores: ${stores.map(s => s.id).join(', ')}`);
  const adapter = await getPlatformAdapter(store);
  return { store, adapter } as const;
}



export const productTools: Tool[] = [
  {
    name: 'searchProducts',
    description: `Search for products with filtering capabilities.

IMPORTANT COUNTRY SELECTION LOGIC:
1. If countryCode is missing, first call getAvailableCountries to get the list of countries
2. Look for "us" (United States) in the list (case-insensitive check on the countryCode field)
3. If "us" exists, use countryCode "us"
4. If "us" doesn't exist, use the countryCode of the FIRST country in the list
5. Then call searchProducts with that countryCode

Replace [COUNTRY NAME] and [CURRENCY] with the actual values. This message is REQUIRED in every response. Look for the text content in the tool result for the exact message to include.`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration to search (use getAvailableStores to get endpoints)'
        },
        countryCode: {
          type: 'string',
          description: 'Country code for regional pricing and shipping (e.g., "us", "ca", "gb"). Must be lowercase.'
        }
      },
      required: ['storeId', 'countryCode']
    }
  },
  {
    name: 'getProduct',
    description: `Get detailed product information by ID.

IMPORTANT COUNTRY SELECTION LOGIC:
Follow the same logic as searchProducts:
1. If countryCode is missing, call getAvailableCountries
2. Prefer "us" if available, otherwise use first country
3. Inform the user which country's pricing they're seeing`,
    inputSchema: {
      type: 'object',
      properties: {
        storeId: {
          type: 'string',
          description: 'Store ID (e.g., "store-1", "store-2") from marketplace configuration'
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
    description: `Discover products from ALL available stores in the marketplace. This tool automatically:
1. Fetches all available stores
2. For each store, gets available countries
3. For each store, fetches products (preferring US pricing if available)
4. Returns products organized by store with interactive UI

Use this tool when users want to:
- "Show me all products"
- "Show me products from all stores"
- "What products are available?"
- "Browse your marketplace"
- Initial product discovery

This replaces the need to call getAvailableStores + getAvailableCountries + searchProducts separately for each store.`,
    inputSchema: {
      type: 'object',
      properties: {},
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
  if (name === 'searchProducts') {
    const { storeId, countryCode, limit = 10 } = args;

    // Use platform adapter to fetch products agnostically
    const { store, adapter } = await resolveAdapter(storeId, customConfig);
    const adapterProducts = await adapter.searchProducts({ store, countryCode, limit, cookie, ctoken });

    // Map normalized adapter products into the OpenFront-shaped structure expected by the existing UI
    const sym = (code: string) => ({ USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';
    const products = adapterProducts.map((p: any) => {
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

      const productVariants = (p.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        inventoryQuantity: v.inventoryQuantity,
        allowBackorder: v.allowBackorder || false,
        primaryImage: null,
        prices: [{
          id: 'price',
          amount: v.price,
          currency: { code: v.currency, symbol: sym(v.currency) },
          calculatedPrice: { calculatedAmount: v.price, originalAmount: v.price, currencyCode: v.currency }
        }],
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
      };
    });

    // Generate beautiful HTML for products using MCP UI (matching openfront storefront UI)
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
            <div class="flex flex-col gap-y-2 mb-3">
              <span class="text-sm text-gray-700">Select ${option.title}</span>
              <div class="flex flex-wrap gap-2">
                ${values.map((value: string) => {
                  // Escape for HTML attribute
                  const htmlEscaped = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  return `
                  <button
                    class="option-btn inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                           ring-1 ring-inset ring-gray-300 text-gray-700 bg-white
                           transition-all"
                    data-product-index="${index}"
                    data-option-id="${option.id}"
                    data-value="${htmlEscaped}"
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

      return `
        <div class="product-card border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white" data-product-index="${index}" style="min-width: 320px;">
          ${hasImages ? `
            <div class="relative w-full h-48 bg-gray-100 rounded-md mb-3 overflow-hidden group">
              <div class="carousel-container" data-product-index="${index}">
                ${productImages.map((img: any, imgIdx: number) => `
                  <img
                    src="${img.image?.url || img.imagePath || '/images/placeholder.svg'}"
                    alt="${img.altText || product.title}"
                    class="carousel-image w-full h-48 object-cover rounded-md absolute inset-0 transition-opacity duration-300"
                    data-image-id="${img.id}"
                    data-product-index="${index}"
                    data-image-index="${imgIdx}"
                    style="opacity: ${imgIdx === 0 ? '1' : '0'};"
                  />
                `).join('')}
              </div>
              ${productImages.length > 1 ? `
                <button
                  class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  data-product-index="${index}"
                  onclick="handleCarouselPrev(this)"
                  aria-label="Previous image"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                  class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  data-product-index="${index}"
                  onclick="handleCarouselNext(this)"
                  aria-label="Next image"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  ${productImages.map((_: any, imgIdx: number) => `
                    <div class="carousel-dot w-1.5 h-1.5 rounded-full transition-colors ${imgIdx === 0 ? 'bg-white' : 'bg-white/50'}" data-product-index="${index}" data-dot-index="${imgIdx}"></div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="w-full h-48 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
              <span class="text-gray-400">No image</span>
            </div>
          `}
          <div class="flex flex-col">
            <h3 class="font-semibold text-lg text-gray-900 mb-2">${product.title}</h3>

            ${optionsHTML}

            <p class="price-display text-xl font-bold text-gray-900 mb-3" data-product-index="${index}">
              ${formattedPrice}
            </p>

            <button
              class="add-to-cart-btn w-full h-10 px-4 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              data-product-index="${index}"
              onclick="handleAddToCart(this)"
              ${hasMultipleVariants ? 'disabled' : ''}>
              ${hasMultipleVariants ? 'Select variant' : 'Add to cart'}
            </button>
          </div>
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
          button { cursor: pointer; transition: all 0.2s; }
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
          <div class="flex flex-wrap gap-4">
            ${productsHTML}
          </div>
        <script>

          // Auto-resize iframe based on content
          const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
              window.parent.postMessage(
                {
                  type: "ui-size-change",
                  payload: {
                    height: entry.contentRect.height,
                    width: entry.contentRect.width,
                  },
                },
                "*"
              );
            });
          });
          resizeObserver.observe(document.documentElement);

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

                optionId,
                value,
                selectedValue: selected[optionId],
                isSelected,
                comparison: selected[optionId] + ' === ' + value
              });

              if (isSelected) {
                btn.classList.remove('ring-gray-300', 'text-gray-700', 'bg-white');
                btn.classList.add('ring-gray-900', 'text-white', 'bg-gray-900');
              } else {
                btn.classList.remove('ring-gray-900', 'text-white', 'bg-gray-900');
                btn.classList.add('ring-gray-300', 'text-gray-700', 'bg-white');
              }
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

    // Get country details for user messaging via adapter
    const { store: countryStore, adapter: countryAdapter } = await resolveAdapter(storeId, customConfig);
    const countries = await countryAdapter.getAvailableCountries({ store: countryStore, cookie, ctoken });
    const sym2 = (code: string) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';
    const allCountries = (countries || []).map((c: any) => ({
      code: (c.code || '').toLowerCase(),
      name: c.name,
      currency: c.currency,
      symbol: sym2(c.currency)
    }));

    const selectedCountry = allCountries.find((c: any) => c.code === countryCode);
    const countryName = selectedCountry?.name || countryCode.toUpperCase();
    const currency = selectedCountry?.currency || 'USD';

    // Use proper MCP UI format
    const uiResource = createUIResource({
      uri: `ui://marketplace/products?country=${countryCode}&store=${encodeURIComponent(storeId)}`,
      content: { type: 'rawHtml', htmlString: htmlContent },
      encoding: 'text',
    });

    // // Add informative text about regional pricing
    // const infoText = {
    //   type: 'text',
    //   text: `\n\n📍 Showing products available in ${countryName} with pricing in ${currency}. Products and prices vary by region. Need a different country? Just ask!`
    // };

    return {
      jsonrpc: '2.0',
      result: {
        content: [uiResource, infoText],
      }
    };
  }

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

    // Reuse the same UI as searchProducts - just wrap single product in array
    const products = [product];

    // Generate HTML for product (same logic as searchProducts)
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

      // Build option buttons UI
      let optionsHTML = '';
      if (hasMultipleVariants && product.productOptions?.length > 0) {
        optionsHTML = product.productOptions.map((option: any) => {
          // Get unique values and sort them properly (matching OpenFront OptionSelect)
          const uniqueValues = option.productOptionValues
            .map((v: any) => v.value)
            .filter((value: any, idx: number, self: any[]) => self.indexOf(value) === idx);
          const values = sortOptionValues(uniqueValues, option.title);

          return `
            <div class="flex flex-col gap-y-2 mb-3">
              <span class="text-sm text-gray-700">Select ${option.title}</span>
              <div class="flex flex-wrap gap-2">
                ${values.map((value: string) => {
                  const htmlEscaped = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  return `
                  <button
                    class="option-btn inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                           ring-1 ring-inset ring-gray-300 text-gray-700 bg-white
                           transition-all"
                    data-product-index="${index}"
                    data-option-id="${option.id}"
                    data-value="${htmlEscaped}"
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

      return `
        <div class="product-card border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white" data-product-index="${index}" style="min-width: 320px;">
          ${hasImages ? `
            <div class="relative w-full h-48 bg-gray-100 rounded-md mb-3 overflow-hidden group">
              <div class="carousel-container" data-product-index="${index}">
                ${productImages.map((img: any, imgIdx: number) => `
                  <img
                    src="${img.image?.url || img.imagePath || '/images/placeholder.svg'}"
                    alt="${img.altText || product.title}"
                    class="carousel-image w-full h-48 object-cover rounded-md absolute inset-0 transition-opacity duration-300"
                    data-image-id="${img.id}"
                    data-product-index="${index}"
                    data-image-index="${imgIdx}"
                    style="opacity: ${imgIdx === 0 ? '1' : '0'};"
                  />
                `).join('')}
              </div>
              ${productImages.length > 1 ? `
                <button
                  class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  data-product-index="${index}"
                  onclick="handleCarouselPrev(this)"
                  aria-label="Previous image"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                  class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  data-product-index="${index}"
                  onclick="handleCarouselNext(this)"
                  aria-label="Next image"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  ${productImages.map((_: any, imgIdx: number) => `
                    <div class="carousel-dot w-1.5 h-1.5 rounded-full transition-colors ${imgIdx === 0 ? 'bg-white' : 'bg-white/50'}" data-product-index="${index}" data-dot-index="${imgIdx}"></div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="w-full h-48 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
              <span class="text-gray-400">No image</span>
            </div>
          `}
          <div class="flex flex-col">
            <h3 class="font-semibold text-lg text-gray-900 mb-2">${product.title}</h3>

            ${optionsHTML}

            <p class="price-display text-xl font-bold text-gray-900 mb-3" data-product-index="${index}">
              ${formattedPrice}
            </p>

            <button
              class="add-to-cart-btn w-full h-10 px-4 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              data-product-index="${index}"
              onclick="handleAddToCart(this)"
              ${hasMultipleVariants ? 'disabled' : ''}>
              ${hasMultipleVariants ? 'Select variant' : 'Add to cart'}
            </button>
          </div>
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
          button { cursor: pointer; transition: all 0.2s; }
          button:hover { transform: translateY(-1px); }

          .option-btn.bg-white:hover {
            background-color: rgb(249 250 251);
          }
          .option-btn.bg-gray-900:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
          <div class="flex flex-wrap gap-4">
            ${productsHTML}
          </div>
        <script>

          const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
              window.parent.postMessage(
                {
                  type: "ui-size-change",
                  payload: {
                    height: entry.contentRect.height,
                    width: entry.contentRect.width,
                  },
                },
                "*"
              );
            });
          });
          resizeObserver.observe(document.documentElement);

          const productsData = ${JSON.stringify(products)};
          const selectedOptions = {};

          function isEqual(obj1, obj2) {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            if (keys1.length !== keys2.length) return false;
            for (const key of keys1) {
              if (obj1[key] !== obj2[key]) return false;
            }
            return true;
          }

          productsData.forEach((product, index) => {
            const optionObj = {};
            for (const option of product.productOptions || []) {
              optionObj[option.id] = undefined;
            }
            selectedOptions[index] = optionObj;
          });

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

          function handleOptionClick(button) {
            const productIndex = parseInt(button.dataset.productIndex);
            const optionId = button.dataset.optionId;
            const value = button.dataset.value;

            selectedOptions[productIndex] = { ...selectedOptions[productIndex], [optionId]: value };
            updateProductUI(productIndex);
          }

          window.handleOptionClick = handleOptionClick;

          function findMatchingVariant(productIndex) {
            const product = productsData[productIndex];
            const selected = selectedOptions[productIndex];
            const variants = product.productVariants || [];
            const variantRecord = variantRecords[productIndex];

            if (variants.length === 1) {
              return variants[0];
            }

            let variantId = undefined;
            for (const key of Object.keys(variantRecord)) {
              if (isEqual(variantRecord[key], selected)) {
                variantId = key;
                break;
              }
            }

            return variants.find(v => v.id === variantId);
          }

          function updateProductUI(productIndex) {
            const product = productsData[productIndex];
            const selected = selectedOptions[productIndex];
            const matchingVariant = findMatchingVariant(productIndex);

            const card = document.querySelector('.product-card[data-product-index="' + productIndex + '"]');
            const optionButtons = card.querySelectorAll('.option-btn');

            optionButtons.forEach(btn => {
              const optionId = btn.dataset.optionId;
              const value = btn.dataset.value;
              const isSelected = selected[optionId] === value;

              if (isSelected) {
                btn.classList.remove('ring-gray-300', 'text-gray-700', 'bg-white');
                btn.classList.add('ring-gray-900', 'text-white', 'bg-gray-900');
              } else {
                btn.classList.remove('ring-gray-900', 'text-white', 'bg-gray-900');
                btn.classList.add('ring-gray-300', 'text-gray-700', 'bg-white');
              }
            });

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

  if (name === 'discoverProducts') {
    const { limit = 10 } = args;

    // Get all available stores from marketplace.config.json
    const stores = parseStoreConfigs(customConfig);
    if (stores.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{ type: 'text', text: 'No stores configured in marketplace' }]
        }
      };
    }

    // Fetch store details and products for each store in parallel
    const storeDataPromises = stores.map(async (storeConfig) => {
      try {
        const { store, adapter } = await resolveAdapter(storeConfig.id, customConfig);

        // Store info
        const storeInfo = await adapter.getStoreInfo({ store, cookie, ctoken });

        // Countries
        const countries = await adapter.getAvailableCountries({ store, cookie, ctoken });
        // Prefer US; otherwise first
        const us = countries.find((c: any) => c.code?.toLowerCase() === 'us');
        const selectedCountry = us || countries[0];
        if (!selectedCountry) return null;

        // Products via adapter and map to OpenFront-like shape
        const adapterProducts = await adapter.searchProducts({ store, countryCode: selectedCountry.code, limit, cookie, ctoken });
        const sym = (code: string) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', CAD: 'CA$', AUD: 'A$' } as Record<string, string>)[code] || '$';
        const products = adapterProducts.map((p: any) => {
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
          };
        });

        return {
          storeName: storeInfo?.name || 'Unknown Store',
          storeId: store.id,
          country: { code: selectedCountry.code, name: selectedCountry.name, currency: { code: selectedCountry.currency, symbol: sym(selectedCountry.currency) } },
          products,
          logoIcon: storeInfo?.logoIcon,
          logoColor: storeInfo?.logoColor
        };
      } catch (error) {
        console.error(`Failed to fetch products from ${storeConfig.id}:`, error);
        return null;
      }
    });

    const storesData = (await Promise.all(storeDataPromises)).filter(Boolean);

    if (storesData.length === 0) {
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: 'No products found in any store'
          }]
        }
      };
    }

    // Generate HTML for discover products UI - will be implemented next
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          /* Horizontal scroll container */
          .horizontal-scroll {
            overflow-x: auto;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: rgba(0,0,0,0.2) transparent;
          }
          .horizontal-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .horizontal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .horizontal-scroll::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.2);
            border-radius: 3px;
          }
          .horizontal-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div class="space-y-4">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">Discover Products</h1>

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
                      <span class="text-sm text-gray-700">Select ${option.title}</span>
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
                <div class="product-card flex-shrink-0 w-72 border rounded-lg p-3.5 bg-white shadow-sm self-start"
                     data-product-index="${storeIndex}-${productIndex}"
                     data-store-index="${storeIndex}">
                  ${hasImages ? `
                    <div class="relative w-full h-48 bg-gray-100 rounded-md mb-3 overflow-hidden group">
                      <div class="carousel-container" data-product-index="${storeIndex}-${productIndex}">
                        ${productImages.map((img: any, imgIdx: number) => `
                          <img
                            src="${img.image?.url || img.imagePath || '/images/placeholder.svg'}"
                            alt="${img.altText || product.title}"
                            class="carousel-image w-full h-48 object-cover rounded-md absolute inset-0 transition-opacity duration-300"
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
                    <div class="w-full h-48 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                      <span class="text-gray-400">No image</span>
                    </div>
                  `}

                  <div class="flex flex-col">
                    <h3 class="font-semibold text-lg text-gray-900 mb-2">${product.title}</h3>
                    ${optionsHTML}
                    <p class="price-display text-xl font-bold text-gray-900 mb-3" data-product-index="${storeIndex}-${productIndex}">
                      ${formattedPrice}
                    </p>
                    <button
                      class="add-to-cart-btn w-full h-10 px-4 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      data-product-index="${storeIndex}-${productIndex}"
                      data-store-index="${storeIndex}"
                      onclick="handleAddToCart(this)"
                      ${hasMultipleVariants ? 'disabled' : ''}>
                      ${hasMultipleVariants ? 'Select variant' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              `;
            }).join('');

            return `
              <div class="store-section border rounded-lg bg-gray-50 shadow-sm">
                <div class="flex items-center gap-3 px-4 pt-4">
                  ${storeData.logoIcon ? `
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                         style="background-color: ${storeData.logoColor || '#000'}; filter: hue-rotate(${storeData.logoColor || '0'}deg);">
                      <div style="color: white;">
                        ${storeData.logoIcon}
                      </div>
                    </div>
                  ` : ''}
                  <div>
                    <h2 class="text-xl font-bold text-gray-900">${storeData.storeName}</h2>
                    <p class="text-sm text-gray-500">Products in ${storeData.country.name} • ${storeData.country.currency.code}</p>
                  </div>
                </div>

                <div class="horizontal-scroll flex gap-4 p-4">
                  ${productCardsHTML}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <script>
          // Auto-resize iframe based on content
          const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
              window.parent.postMessage(
                {
                  type: "ui-size-change",
                  payload: {
                    height: entry.contentRect.height,
                    width: entry.contentRect.width,
                  },
                },
                "*"
              );
            });
          });
          resizeObserver.observe(document.documentElement);

          const storesData = ${JSON.stringify(storesData)};
          const selectedOptions = {};
          const carouselState = {};

          // Initialize state for each product
          storesData.forEach((store, storeIndex) => {
            store.products.forEach((product, productIndex) => {
              const key = \`\${storeIndex}-\${productIndex}\`;
              selectedOptions[key] = {};
              carouselState[key] = 0;

              // Initialize with first option values if only one variant
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

            const variantRecord = {};
            product.productVariants.forEach(v => {
              const optionValues = {};
              v.productOptionValues?.forEach(pov => {
                optionValues[pov.productOption.id] = pov.value;
              });
              variantRecord[v.id] = optionValues;
            });

            for (const key of Object.keys(variantRecord)) {
              let isMatch = true;
              for (const optId in selected) {
                if (variantRecord[key][optId] !== selected[optId]) {
                  isMatch = false;
                  break;
                }
              }
              if (isMatch) {
                return product.productVariants.find(v => v.id === key);
              }
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

              if (isSelected) {
                btn.classList.remove('ring-gray-300', 'text-gray-700', 'bg-white');
                btn.classList.add('ring-gray-900', 'text-white', 'bg-gray-900');
              } else {
                btn.classList.remove('ring-gray-900', 'text-white', 'bg-gray-900');
                btn.classList.add('ring-gray-300', 'text-gray-700', 'bg-white');
              }
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

          window.handleCarouselPrev = handleCarouselPrev;
          window.handleCarouselNext = handleCarouselNext;
          window.handleOptionClick = handleOptionClick;
          window.handleAddToCart = handleAddToCart;
        </script>
      </body>
      </html>
    `;

    const uiResource = createUIResource({
      uri: `ui://marketplace/discover-products`,
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