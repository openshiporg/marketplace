export function getStoreLogoHue(logoColor: unknown): number {
  if (typeof logoColor !== "string" && typeof logoColor !== "number") return 0;

  const value = Number.parseFloat(String(logoColor));
  if (!Number.isFinite(value)) return 0;

  return ((value % 360) + 360) % 360;
}

/**
 * A source store's logo is an inline SVG string from another server. It is only ever shown as an
 * <img> data URI, where scripts and external loads inside the SVG cannot run.
 */
export function storeLogoDataUri(logoIcon: unknown): string | undefined {
  if (typeof logoIcon !== "string") return undefined;
  const svg = logoIcon.trim();
  if (!/^<svg[\s>]/i.test(svg) || svg.length > 20000) return undefined;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
