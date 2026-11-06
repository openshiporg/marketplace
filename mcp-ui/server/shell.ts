import { escapeHtml, scriptJson } from '@/lib/safe-content';
import { getBaseUrl } from '@/features/marketplace/lib/getBaseUrl';
import type { CardPayload } from '../types';
import { MCP_UI_RUNTIME_VERSION } from './version';

const FALLBACK_ORIGIN = 'https://marketplace.openship.org';

/**
 * The small HTML document every Marketplace MCP card is delivered as. The card data travels as inert JSON;
 * the TuffUI runtime (public/mcp-ui/runtime.js, built by scripts/build-mcp-ui.mjs) renders it inside the sandboxed iframe.
 */
export async function renderMcpCard(payload: CardPayload, title: string): Promise<string> {
  const origin = ((await getBaseUrl().catch(() => '')) || FALLBACK_ORIGIN).replace(/\/$/, '');
  const v = MCP_UI_RUNTIME_VERSION;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${escapeHtml(origin)}/mcp-ui/runtime.css?v=${v}">
</head>
<body>
<div id="root"></div>
<script type="application/json" id="mcp-data">${scriptJson(payload)}</script>
<script src="${escapeHtml(origin)}/mcp-ui/runtime.js?v=${v}"></script>
</body>
</html>`;
}
