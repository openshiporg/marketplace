export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

/** Serialize inert data for an inline script without allowing an HTML break-out. */
export function scriptJson(value: unknown): string {
  const serialized = JSON.stringify(value) ?? 'null';
  return serialized.replace(/[<>&\u2028\u2029]/g, character => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026',
    '\u2028': '\\u2028', '\u2029': '\\u2029',
  }[character] || character));
}

/** Keep image/embed destinations on HTTP(S); reject data, javascript, and protocol-relative URLs. */
export function safeHttpUrl(value: unknown, baseUrl?: string, fallback = ''): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const candidate = value.trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    if (!baseUrl) return candidate;
  }
  try {
    const url = new URL(candidate, baseUrl);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.toString();
    }
  } catch {
    // Fall through to the inert placeholder.
  }
  return fallback;
}
