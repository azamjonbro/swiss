import type { Watch } from '@/types/models';
import { fetchWatches } from '@/services/watches';

/**
 * Shared across every brand-showcase surface on the page (the houses
 * carousel, the maison grid) — hovering or scrolling past the same brand in
 * two different sections should never fire the request twice. Caches the
 * in-flight promise, not just the resolved value, so overlapping calls
 * before the first response lands also collapse into one request.
 */
const cache = new Map<string, Promise<Watch[]>>();

export function getBrandWatches(brandId: string, limit = 2): Promise<Watch[]> {
  const key = `${brandId}:${limit}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = fetchWatches({ brand: brandId, limit })
      .then((res) => res.items)
      .catch((err) => {
        cache.delete(key);
        throw err;
      });
    cache.set(key, entry);
  }
  return entry;
}
