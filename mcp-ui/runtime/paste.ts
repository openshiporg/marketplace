/**
 * Turns pasted contact and address text ("Jane Doe\njane@x.com\n1600 Main St\nDallas, TX 75201\nUSA\n214-555-0142")
 * into form fields. It only copies what is plainly there; anything it cannot place is left for the shopper to type.
 */
export type PastedDetails = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
};

const EMAIL = /[^\s@<>(),;]+@[^\s@<>(),;]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const COUNTRY: Record<string, string> = {
  usa: 'us', us: 'us', 'u.s.': 'us', 'u.s.a.': 'us', 'united states': 'us', 'united states of america': 'us', america: 'us',
  canada: 'ca', ca: 'ca', uk: 'gb', 'u.k.': 'gb', 'united kingdom': 'gb', 'great britain': 'gb', england: 'gb', gb: 'gb',
  australia: 'au', au: 'au', germany: 'de', deutschland: 'de', de: 'de', france: 'fr', fr: 'fr', mexico: 'mx', 'méxico': 'mx', mx: 'mx',
  ireland: 'ie', ie: 'ie', 'new zealand': 'nz', nz: 'nz', india: 'in', spain: 'es', es: 'es', italy: 'it', it: 'it', netherlands: 'nl', nl: 'nl',
};
const STREET = /^\d+[A-Za-z]?\s+\S+/;
const UNIT = /^(apt|apartment|suite|ste|unit|#|floor|fl|bldg|building)\b/i;
// "Dallas, TX 75201", "Toronto, ON M5V 2T6", "London SW1A 1AA", "75201 Dallas"
const CITY_REGION_POSTAL = /^(.+?),?\s+([A-Za-z]{2,3})\.?\s+([A-Za-z0-9][A-Za-z0-9 -]{2,9})$/;
const CITY_POSTAL = /^(.+?),?\s+(\d{4,6}(?:-\d{4})?)$/;
const POSTAL_CITY = /^(\d{4,6})\s+(.+)$/;

export function parsePastedDetails(text: string): PastedDetails {
  const out: PastedDetails = {};
  let lines = text
    .split(/\r?\n|;/)
    .map((l) => l.replace(/^\s*(name|email|e-mail|phone|tel|mobile|address|ship to|deliver to)\s*:\s*/i, '').trim())
    .filter(Boolean);
  // One line with commas ("Jane Doe, 1 Main St, Dallas, TX 75201"): split it, then re-join "City" + "ST 75201".
  if (lines.length === 1 && lines[0].includes(',')) {
    const parts = lines[0].split(',').map((p) => p.trim()).filter(Boolean);
    lines = [];
    for (const part of parts) {
      const prev = lines[lines.length - 1];
      if (prev && /^[A-Za-z]{2,3}\.?\s+[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(part) && /\d/.test(part) && !STREET.test(prev) && !EMAIL.test(prev)) lines[lines.length - 1] = `${prev}, ${part}`;
      else lines.push(part);
    }
  }

  const take = (re: RegExp, key: 'email' | 'phone') => {
    lines = lines.flatMap((line) => {
      const m = line.match(re);
      if (!m || out[key]) return [line];
      out[key] = m[0].trim();
      const rest = line.replace(m[0], '').replace(/^[\s,|-]+|[\s,|-]+$/g, '');
      return rest ? [rest] : [];
    });
  };
  take(EMAIL, 'email');
  // A phone is a run of 8+ digits that is not part of a street line or a postal line.
  lines = lines.flatMap((line) => {
    if (out.phone || STREET.test(line) || CITY_REGION_POSTAL.test(line) || CITY_POSTAL.test(line) || POSTAL_CITY.test(line)) return [line];
    const m = line.match(PHONE);
    if (!m || m[0].replace(/\D/g, '').length < 8) return [line];
    out.phone = m[0].trim();
    const rest = line.replace(m[0], '').trim();
    return rest ? [rest] : [];
  });

  const rest: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase().replace(/\.$/, '');
    if (!out.countryCode && COUNTRY[lower]) { out.countryCode = COUNTRY[lower]; continue; }
    if (!out.address1 && STREET.test(line)) { out.address1 = line; continue; }
    if (out.address1 && !out.address2 && UNIT.test(line)) { out.address2 = line; continue; }
    if (!out.city) {
      // "Dallas, TX 75201, USA" on one line: peel off a trailing country first.
      const parts = line.split(',').map((p) => p.trim());
      const tail = parts.length > 1 ? COUNTRY[parts[parts.length - 1].toLowerCase()] : undefined;
      const body = tail ? parts.slice(0, -1).join(', ') : line;
      const m1 = body.match(CITY_REGION_POSTAL);
      const m2 = !m1 && body.match(CITY_POSTAL);
      const m3 = !m1 && !m2 && body.match(POSTAL_CITY);
      if (m1 && /\d/.test(m1[3])) { out.city = m1[1].trim(); out.province = m1[2].toUpperCase(); out.postalCode = m1[3].trim().toUpperCase(); }
      else if (m2) { out.city = m2[1].trim(); out.postalCode = m2[2]; }
      else if (m3) { out.postalCode = m3[1]; out.city = m3[2].trim(); }
      if (out.city) { if (tail && !out.countryCode) out.countryCode = tail; continue; }
    }
    rest.push(line);
  }

  // The first leftover line before the street is the name.
  const found = out.address1 || out.email || out.phone;
  const name = found ? rest.find((l) => /^[\p{L}][\p{L}.'-]*(\s+[\p{L}][\p{L}.'-]*)+$/u.test(l)) : undefined;
  if (name) {
    out.name = name;
    const words = name.split(/\s+/);
    out.firstName = words[0];
    if (words.length > 1) out.lastName = words.slice(1).join(' ');
  }
  return out;
}
