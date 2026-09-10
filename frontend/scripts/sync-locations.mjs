/**
 * Pulls the boutiques the admin panel holds into `src/data/locations.json`.
 *
 * The /stores page, its `JewelryStore` JSON-LD and the sitemap are all
 * *prerendered*, and a static build cannot call a runtime API — so the file
 * stays exactly what it was: the build's copy of the addresses. What changed is
 * who fills it in. It used to be a person editing JSON; it is now
 * `GET /api/branches`, and the branch controller pings the deploy hook on every
 * write, so saving an address in the admin is what schedules the build that
 * publishes it.
 *
 * Runs before `vite build` (see package.json). Three rules, in order of how
 * much damage getting them wrong would do:
 *
 *   1. **An unreachable API leaves the file alone.** Overwriting real published
 *      addresses with `[]` because a deploy ran while the API box was
 *      restarting would silently unpublish /stores — the route stops being
 *      registered, the sitemap stops listing it, and the JSON-LD disappears.
 *      A stale address is recoverable; a deleted page is a 404 in search
 *      results.
 *   2. **A branch missing a street address is dropped**, matching
 *      `usableLocations` in schema.mjs: a LocalBusiness node needs somewhere a
 *      visitor could actually walk to.
 *   3. **Nothing is invented.** Absent stays absent — no guessed coordinates,
 *      no placeholder postcode.
 *
 *   node scripts/sync-locations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './site-env.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'src', 'data', 'locations.json');

const ENV = { ...loadEnvFiles(ROOT, process.env.NODE_ENV || 'production'), ...process.env };
const API = String(ENV.SEO_API_URL || 'https://swiss.sds-max.uz').replace(/\/+$/, '');
const TIMEOUT_MS = 10_000;

const text = (value) => String(value ?? '').trim();

/** The API's Branch record, as the shape `src/data/locations.ts` publishes. */
function toLocation(branch) {
  const phones = Array.isArray(branch.phones) ? branch.phones.map(text).filter(Boolean) : [];
  const hours = Array.isArray(branch.openingHours) ? branch.openingHours.map(text).filter(Boolean) : [];
  const lat = Number(branch.geo?.latitude);
  const lng = Number(branch.geo?.longitude);

  return {
    name: text(branch.name),
    streetAddress: text(branch.streetAddress),
    addressLocality: text(branch.addressLocality),
    addressRegion: text(branch.addressRegion),
    postalCode: text(branch.postalCode),
    addressCountry: text(branch.addressCountry) || 'UZ',
    // `telephone` is single-valued in schema.org, and a branch answers its own
    // first number. The rest are shown on /about, which reads the API directly.
    telephone: phones[0] ?? '',
    openingHours: hours,
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null,
    mapUrl: text(branch.mapUrl) || null,
  };
}

function keep() {
  let existing = '[]';
  try {
    existing = readFileSync(TARGET, 'utf8');
  } catch {
    /* never written yet — an empty array is the honest starting state */
  }
  const count = (JSON.parse(existing || '[]') || []).length;
  console.log(`[locations] keeping the ${count} boutique(s) already on disk`);
}

const response = await fetch(`${API}/api/branches`, {
  headers: { accept: 'application/json' },
  signal: AbortSignal.timeout(TIMEOUT_MS),
}).catch((error) => {
  console.warn(`[locations] ${API} unreachable (${error.message})`);
  return null;
});

if (!response || !response.ok) {
  if (response) console.warn(`[locations] ${API}/api/branches returned ${response.status}`);
  keep();
} else {
  const body = await response.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;

  if (!items) {
    console.warn('[locations] unexpected response shape — expected { items: [] }');
    keep();
  } else {
    const locations = items.map(toLocation).filter((loc) => loc.name && loc.streetAddress);
    const dropped = items.length - locations.length;
    writeFileSync(TARGET, `${JSON.stringify(locations, null, 2)}\n`);
    console.log(
      `[locations] ${locations.length} boutique(s) written${dropped ? ` — ${dropped} skipped for having no street address` : ''}`,
    );
  }
}
