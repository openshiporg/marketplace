export function getStoreLogoHue(logoColor: unknown): number {
  if (typeof logoColor !== "string" && typeof logoColor !== "number") return 0;

  const value = Number.parseFloat(String(logoColor));
  if (!Number.isFinite(value)) return 0;

  return ((value % 360) + 360) % 360;
}
