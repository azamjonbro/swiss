/**
 * Client-side mirror of backend/src/utils/modelGroup.ts.
 *
 * Kept in sync by hand — the logic is six lines and has not changed since
 * creation, so a shared package would add more complexity than it saves.
 *
 * The slug helper is a pure-JS equivalent of `slugify(input, { lower: true,
 * strict: true, trim: true })` — the admin panel does not depend on the
 * `slugify` package, and pulling it in for one utility is not worth the
 * bundle weight.
 */

function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // drop non-alphanumeric
    .replace(/[\s-]+/g, '-')        // whitespace / hyphens → single hyphen
    .replace(/^-+|-+$/g, '');       // trim leading/trailing hyphens
}

export function modelGroupKey(name: string): string {
  const normalised = String(name ?? '')
    // "40 mm" / "40MM" / "40-mm" → "40mm"
    .replace(/(\d)\s*[-\s]?\s*mm\b/gi, '$1mm')
    .replace(/\s+/g, ' ')
    .trim();
  return toSlug(normalised);
}
