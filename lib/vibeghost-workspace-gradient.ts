export type VibeGhostWorkspaceGradient = {
  colors: [string, string, string, string];
  seeds: number[];
};

type OklchColor = { l: number; c: number; h: number };

// Kept byte-for-byte equivalent to Hashvatar's 0.1.2 palette and seed model,
// which VibeGhost uses for workspace identities.
function fnv1a(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 1831565813) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToVibeGhostSeeds(value: string, count: number) {
  const random = seededRandom(fnv1a(value.toLowerCase().trim()));
  return Array.from({ length: count }, () => random());
}

function generateColor(
  seed: number,
  lightnessSeed: number,
  chromaSeed: number,
  isSecondary: boolean,
  baseHue: number
): OklchColor {
  if (isSecondary) {
    return {
      l: 0.18 + chromaSeed * 0.2,
      c: Math.min(0.08 + lightnessSeed * 0.12, 0.37),
      h: baseHue,
    };
  }
  return {
    l: 0.55 + lightnessSeed * 0.22,
    c: Math.min(0.18 + chromaSeed * 0.18, 0.37),
    h: baseHue,
  };
}

function toCss(color: OklchColor) {
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

/** Convert an OS.org product hex color to its OKLCH hue without adding a color dependency. */
export function hexToOklchHue(value: string): number | null {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value.trim());
  if (!match) return null;

  const [red, green, blue] = match.slice(1).map((channel) => {
    const srgb = Number.parseInt(channel, 16) / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, b);
  if (chroma < 0.0001) return null;
  return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
}

export function getVibeGhostWorkspaceGradient(
  value: string,
  accentColor?: string
): VibeGhostWorkspaceGradient {
  const colorSeeds = hashToVibeGhostSeeds(value, 12);
  const accentHue = accentColor ? hexToOklchHue(accentColor) : null;
  const baseHue = accentHue ?? (colorSeeds[0] * 360) % 360;
  const colors = Array.from({ length: 4 }, (_, index) => toCss(generateColor(
    colorSeeds[index * 3],
    colorSeeds[index * 3 + 1],
    colorSeeds[index * 3 + 2],
    index > 0,
    baseHue
  ))) as VibeGhostWorkspaceGradient['colors'];

  return {
    colors,
    seeds: hashToVibeGhostSeeds(value, 12),
  };
}
