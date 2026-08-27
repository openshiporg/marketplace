/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */
export const beautifulUIStyles = String.raw`
  :root {
    color-scheme: light dark;
    --page: oklch(0.9854 0.0013 286.38);
    --canvas: oklch(0.9607 0.0017 247.84);
    --surface: oklch(1 0 0);
    --inset: oklch(0.9787 0.0017 247.84);
    --hover: oklch(0.9697 0.0017 247.84);
    --hover-2: oklch(0.9331 0.0035 247.86);
    --ink: oklch(0.2469 0.0064 258.36);
    --ink-2: oklch(0.5062 0.0102 264.48);
    --ink-3: oklch(0.6954 0.0094 264.50);
    --line: oklch(0.9459 0.0029 264.54);
    --line-strong: oklch(0.9121 0.0046 258.33);
    --field: oklch(0.9614 0.0013 286.38);
    --signal: oklch(0.6258 0.2050 254.95);
    --signal-ink: oklch(0.5564 0.1869 255.62);
    --signal-tint: oklch(0.9602 0.0194 252.88);
    --green: oklch(0.6031 0.1555 150.88);
    --green-tint: oklch(0.9582 0.0173 159.12);
    --orange: oklch(0.6888 0.1794 49.90);
    --orange-tint: oklch(0.9643 0.0206 67.58);
    --red: oklch(0.6211 0.1924 23.04);
    --red-tint: oklch(0.9557 0.0174 17.46);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --shadow-hairline: 0 0 0 1px var(--line);
    --shadow-btn: 0 0 0 1px var(--line-strong), 0 1px 2px oklch(0.2 0.006 260 / 0.05);
    --shadow-card: 0 0 0 1px var(--line), 0 1px 3px oklch(0.2 0.006 260 / 0.04);
    --shadow-raised: 0 0 0 1px var(--line), 0 2px 10px oklch(0.2 0.006 260 / 0.045);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --page: oklch(0.2088 0.0042 264.48);
      --canvas: oklch(0.2305 0.0041 264.49);
      --surface: oklch(0.2605 0.0058 271.19);
      --inset: oklch(0.2433 0.0041 264.49);
      --hover: oklch(0.2892 0.0056 271.22);
      --hover-2: oklch(0.3177 0.0072 274.75);
      --ink: oklch(0.9637 0.0017 247.84);
      --ink-2: oklch(0.7307 0.0080 260.73);
      --ink-3: oklch(0.5411 0.0100 264.48);
      --line: oklch(0.3084 0.0061 258.35);
      --line-strong: oklch(0.3557 0.0074 264.47);
      --field: oklch(0.2933 0.0056 271.22);
      --signal: oklch(0.6803 0.1728 253.30);
      --signal-ink: oklch(0.7881 0.1127 248.33);
      --signal-tint: oklch(0.6803 0.1728 253.30 / 0.16);
      --green: oklch(0.696 0.16 151);
      --green-tint: oklch(0.696 0.16 151 / 0.14);
      --orange: oklch(0.74 0.16 53);
      --orange-tint: oklch(0.74 0.16 53 / 0.14);
      --red: oklch(0.68 0.19 23);
      --red-tint: oklch(0.68 0.19 23 / 0.14);
    }
  }

  *, *::before, *::after { box-sizing: border-box; border-color: var(--line); }
  html, body { overflow-x: clip; overflow-y: hidden; }
  body {
    margin: 0;
    padding: 0;
    background: var(--canvas) !important;
    color: var(--ink) !important;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px;
    line-height: 1.5;
  }
  h1, h2, h3, h4, p { color: inherit; }
  button, input, select, textarea { font: inherit; }
  button { transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out), opacity 150ms var(--ease-out), transform 150ms var(--ease-out); }
  button:active { transform: scale(.98); }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }

  .store-section,
  .product-card,
  .mcp-card,
  body > div > .bg-gray-50,
  body > .bg-gray-50 {
    border-color: var(--line) !important;
    border-radius: 10px !important;
    background: var(--surface) !important;
    color: var(--ink) !important;
    box-shadow: var(--shadow-card) !important;
  }

  body > .space-y-4 > h1 {
    margin: 0 0 10px !important;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--surface);
    color: var(--ink) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    letter-spacing: -.01em;
    box-shadow: var(--shadow-card);
  }

  .store-section { overflow: hidden; margin-bottom: 12px; }
  .store-section > div:first-child { border-bottom: 1px solid var(--line); padding: 10px 12px !important; background: var(--surface); }
  .store-section h2 { font-size: 16px !important; letter-spacing: -.02em; }
  .horizontal-scroll { background: var(--inset); }
  .tab-button { color: var(--ink-2) !important; font-size: 12px !important; }
  .tab-button.active { color: var(--ink) !important; }
  .tab-button.active::after { background: var(--ink) !important; }
  body button.bg-gray-900, body button.bg-blue-600 { border-radius: 8px !important; background: var(--ink) !important; color: var(--surface) !important; box-shadow: var(--shadow-btn); }
  body button.bg-gray-100, body button.bg-gray-200 { border-color: var(--line) !important; border-radius: 8px !important; background: var(--inset) !important; color: var(--ink-2) !important; }
  body .border { border-color: var(--line) !important; }
  body .rounded-lg { border-radius: 10px !important; }
  body .rounded-md { border-radius: 8px !important; }
  .product-card { border: 0 !important; padding: 10px !important; }
  .product-card h3 { font-size: 16px !important; font-weight: 650 !important; line-height: 1.25 !important; letter-spacing: -.015em; }
  .product-card img, .product-card .bg-gray-100, .product-card .bg-gray-200 { border-radius: 8px !important; background: var(--inset) !important; }
  .product-card .price-display { color: var(--ink) !important; font-size: 16px !important; font-variant-numeric: tabular-nums; }
  .product-card .option-btn { border-color: var(--line-strong) !important; border-radius: 6px !important; background: var(--surface) !important; color: var(--ink-2) !important; box-shadow: var(--shadow-hairline); }
  .product-card .option-btn:hover { background: var(--hover) !important; color: var(--ink) !important; }
  .product-card .option-btn.is-selected {
    border-color: var(--ink) !important;
    background: var(--ink) !important;
    color: var(--surface) !important;
    box-shadow: none !important;
  }
  .product-card .option-btn.is-selected:hover { background: var(--ink) !important; color: var(--surface) !important; opacity: .9; }
  .product-card .add-to-cart-btn { border-radius: 8px !important; background: var(--ink) !important; color: var(--surface) !important; box-shadow: var(--shadow-btn); }
  .product-card .add-to-cart-btn:disabled { background: var(--field) !important; color: var(--ink-3) !important; box-shadow: var(--shadow-hairline); }
  .product-card button:not(.option-btn):not(.add-to-cart-btn) { border-color: var(--line-strong) !important; border-radius: 8px !important; background: var(--surface) !important; color: var(--ink-2) !important; box-shadow: var(--shadow-btn); }

  input, select, textarea {
    border: 1px solid var(--line-strong) !important;
    border-radius: 8px !important;
    background: var(--field) !important;
    color: var(--ink) !important;
    box-shadow: inset 0 1px 2px oklch(0.2 0.006 260 / 0.12);
  }
  input::placeholder, textarea::placeholder { color: var(--ink-3); }

  /* Embedded MCP forms run in their own iframe, so repeat the iOS-safe input
     minimum here instead of relying on the Marketplace document stylesheet. */
  @media (pointer: coarse) {
    input, select, textarea, [contenteditable="true"] { font-size: 16px !important; }
  }

  .text-gray-900, .text-gray-800, .text-gray-700 { color: var(--ink) !important; }
  .text-gray-600, .text-gray-500, .text-gray-400 { color: var(--ink-3) !important; }
  .bg-white { background: var(--surface) !important; }
  .bg-gray-50, .bg-gray-100, .bg-gray-200 { background: var(--inset) !important; }
  .border-gray-200, .border-gray-300 { border-color: var(--line) !important; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 150ms !important; animation-iteration-count: 1 !important; transition-duration: 150ms !important; }
  }
`;

/**
 * Report an embedded document's intrinsic body height to the MCP host.
 * Measuring the body (rather than the root viewport) lets shorter states,
 * such as cart tabs, shrink after a taller state has already been rendered.
 */
export const iframeAutoResizeScript = String.raw`
  (() => {
    const reportSize = () => {
      if (!document.body) return;
      const bodyRect = document.body.getBoundingClientRect();
      const height = Math.max(1, Math.ceil(bodyRect.height));
      const width = Math.max(1, Math.ceil(document.documentElement.clientWidth));
      window.parent.postMessage({
        type: "ui-size-change",
        payload: { height, width },
      }, "*");
    };

    const startSizeObserver = () => {
      const observer = new ResizeObserver(reportSize);
      observer.observe(document.body);
      requestAnimationFrame(reportSize);
      window.addEventListener("load", reportSize, { once: true });
      document.fonts?.ready?.then(reportSize);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startSizeObserver, { once: true });
    } else {
      startSizeObserver();
    }
  })();
`;
