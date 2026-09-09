import { toSlug } from './slug';

/**
 * The grouping key that puts every colourway of one model on one card.
 *
 * Deliberately just the model name, not brand + name: the field stays readable
 * in the database ("prx-40mm", not "6a92ff36…-prx-40mm"), and every query that
 * uses it pairs it with `brand` and `type` anyway — two maisons are allowed to
 * both sell something called "Classic" without being grouped together, and a
 * strap named after the watch it fits is not a colourway of that watch.
 *
 * The name is normalised past what `toSlug` alone does, because the catalogues
 * are not consistent about it: the same model arrives as "PRX 40mm", "PRX
 * 40 mm" and "PRX 40MM" depending on which page the scraper read. Anything
 * that only differs by spacing or case is the same model and has to land on
 * the same key, or the grouping silently does nothing for exactly the products
 * that needed it most.
 */
export function modelGroupKey(name: string): string {
  const normalised = String(name ?? '')
    // "40 mm" / "40MM" / "40-mm" → "40mm", the form the majority already use.
    .replace(/(\d)\s*[-\s]?\s*mm\b/gi, '$1mm')
    // Collapse any run of whitespace so "PRX  40mm" is not its own model.
    .replace(/\s+/g, ' ')
    .trim();
  return toSlug(normalised);
}
