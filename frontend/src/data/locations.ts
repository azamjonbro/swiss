/**
 * Physical boutiques.
 *
 * The data itself lives in `locations.json` so that activating local-business
 * structured data is a content edit, not a code change: fill the array, commit,
 * redeploy. Nothing here is inferred — an address the business has not given us
 * is simply absent, and every consumer treats absent as "do not emit".
 *
 * While the array is empty:
 *   - no `LocalBusiness` / `JewelryStore` JSON-LD is emitted anywhere,
 *   - `/stores` is not registered in the router, not prerendered, not listed in
 *     the sitemap and not linked from the UI — it 404s like any unknown path.
 *
 * The schema for one entry is also published as `locations.schema.json`, so an
 * editor with JSON Schema support validates the file as it is typed.
 */
import raw from './locations.json';

export interface StoreLocation {
  /** Boutique name as it should read in search results, e.g. "SwissWatch Premium Tashkent City". */
  name: string;
  /** Street and building, e.g. "12 Amir Temur Avenue". */
  streetAddress: string;
  /** City, e.g. "Tashkent". */
  addressLocality: string;
  /** Region or viloyat, e.g. "Toshkent shahri". */
  addressRegion: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  addressCountry: 'UZ';
  /** Display form; the `tel:` href is derived from it. */
  telephone: string;
  /**
   * schema.org opening-hours strings, e.g. `["Mo-Sa 10:00-20:00", "Su 11:00-18:00"]`.
   * Emitted verbatim as `openingHours` on the JewelryStore node.
   */
  openingHours: string[];
  /** Coordinates, or null when they have not been surveyed. */
  geo: { latitude: number; longitude: number } | null;
  /** Link to a map pin, or null. */
  mapUrl: string | null;
}

export const storeLocations = raw as StoreLocation[];

/** True once at least one boutique has been published. */
export const hasStoreLocations = storeLocations.length > 0;

export default storeLocations;
