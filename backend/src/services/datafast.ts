/**
 * The single place this API talks to DataFast.
 *
 * Everything the admin dashboard shows is fetched here and nowhere else, for
 * two reasons that both come from DataFast's own limits:
 *
 *   - the API key is a secret. It never leaves this process; the admin panel
 *     asks *us*, and we ask DataFast. There is deliberately no pass-through
 *     endpoint that forwards an arbitrary path, because that would hand
 *     anyone holding an admin token the whole DataFast account.
 *   - DataFast allows 60 requests per window. One dashboard load fans out to
 *     eleven endpoints, so three admins refreshing would exhaust the budget
 *     within a minute. The cache and the in-flight map below are what keep
 *     that from happening, and they are the reason a range can be re-opened
 *     as often as anyone likes for free.
 *
 * The cache lives in memory rather than in Mongo on purpose. pm2 runs this app
 * as a single fork (`ecosystem.config.js`), so one process holds the whole
 * cache and every admin sees the same numbers. Under cluster mode each worker
 * would keep its own copy — the figures would still be correct, DataFast would
 * simply be asked more often.
 */
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/** Guards the 300 MB pm2 ceiling. Far more entries than a dashboard can use. */
const MAX_ENTRIES = 200;

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function isConfigured(): boolean {
  return Boolean(env.datafast.apiKey);
}

/** Query values are always scalars; `undefined` means "omit the parameter". */
export type Params = Record<string, string | number | undefined>;

function cacheKey(path: string, params: Params): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return `${path}?${entries.map(([k, v]) => `${k}=${v}`).join('&')}`;
}

/**
 * Drops the oldest entry once the map is full.
 *
 * `Map` iterates in insertion order, so the first key is the least recently
 * *written* — good enough here, where every entry expires on a timer anyway.
 */
function evictIfFull() {
  if (cache.size < MAX_ENTRIES) return;
  const oldest = cache.keys().next();
  if (!oldest.done) cache.delete(oldest.value);
}

/**
 * One authenticated GET against DataFast, cached and de-duplicated.
 *
 * Two admins opening the same range at the same moment produce one upstream
 * request: the second caller joins the promise the first one started rather
 * than beginning a second round trip.
 */
async function get<T>(path: string, params: Params, ttlMs: number): Promise<T> {
  if (!isConfigured()) {
    throw new ApiError(503, 'Analytics is not configured on this server.', 'DATAFAST_NOT_CONFIGURED');
  }

  const key = cacheKey(path, params);

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetchFromDataFast<T>(path, params)
    .then((value) => {
      evictIfFull();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

async function fetchFromDataFast<T>(path: string, params: Params): Promise<T> {
  const url = new URL(`${env.datafast.apiUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  // A hung upstream must not hold an admin request open indefinitely.
  const abort = AbortSignal.timeout(12_000);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.datafast.apiKey}`, Accept: 'application/json' },
      signal: abort,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[datafast] request failed', path, err);
    throw new ApiError(502, 'Could not reach the analytics provider.', 'DATAFAST_UNREACHABLE');
  }

  if (!response.ok) {
    // The upstream body is logged but never forwarded: it can echo account
    // details, and on a 401 it describes the key itself.
    const body = await response.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error(`[datafast] ${response.status} on ${path}`, body.slice(0, 400));

    if (response.status === 429) {
      throw new ApiError(429, 'Analytics provider rate limit reached. Try again shortly.', 'DATAFAST_RATE_LIMITED');
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(502, 'The analytics API key was rejected.', 'DATAFAST_UNAUTHORIZED');
    }
    throw new ApiError(502, 'The analytics provider returned an error.', 'DATAFAST_ERROR');
  }

  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ *
 * Response shapes                                                     *
 * ------------------------------------------------------------------ */

/**
 * DataFast wraps every success as `{ status, data }`, but `data` is an array
 * for some endpoints and an object for others — and the realtime map's exact
 * shape is not pinned down in the published docs. `rowsOf` accepts each of the
 * forms seen there rather than guessing one and returning nothing if it is
 * wrong; a shape nobody predicted degrades to an empty list instead of a 500.
 */
function rowsOf<T>(payload: unknown, key?: string): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;

  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const nested = key ? (data as Record<string, unknown>)[key] : undefined;
    if (Array.isArray(nested)) return nested as T[];
    const visitors = (data as { visitors?: unknown }).visitors;
    if (Array.isArray(visitors)) return visitors as T[];
  }
  return [];
}

function firstOf<T>(payload: unknown): T | null {
  const rows = rowsOf<T>(payload);
  if (rows.length) return rows[0];
  const data = (payload as { data?: unknown } | null)?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as T) : null;
}

export interface Overview {
  visitors?: number;
  new_visitors?: number;
  returning_visitors?: number;
  pageviews?: number;
  sessions?: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  visitorBreakdown?: {
    new?: number;
    returning?: number;
    newPercentage?: number;
    returningPercentage?: number;
  };
}

export interface TimeseriesPoint {
  timestamp: string;
  visitors?: number;
  pageviews?: number;
  sessions?: number;
}

/** Every breakdown endpoint returns rows of this shape, under its own label. */
export interface BreakdownRow {
  visitors?: number;
  [field: string]: unknown;
}

export interface GoalRow {
  goal?: string;
  name?: string;
  completions?: number;
  visitors?: number;
}

export interface LiveVisitor {
  visitorId?: string;
  currentUrl?: string;
  sessionStartedAt?: string;
  lastSeenAt?: string;
  visitCount?: number;
  location?: { city?: string; country?: string; countryCode?: string; region?: string };
  system?: { browser?: string; os?: string; device?: string };
}

/* ------------------------------------------------------------------ *
 * Typed calls                                                         *
 * ------------------------------------------------------------------ */

interface RangeParams {
  startAt: string;
  endAt: string;
  ttlMs: number;
}

/** Shared by every ranged call: the date window plus the site's timezone. */
function rangeParams({ startAt, endAt }: RangeParams): Params {
  return { startAt, endAt, timezone: env.datafast.timezone };
}

export async function fetchOverview(range: RangeParams): Promise<Overview | null> {
  const payload = await get<unknown>('/analytics/overview', rangeParams(range), range.ttlMs);
  return firstOf<Overview>(payload);
}

export async function fetchTimeseries(
  range: RangeParams,
  interval: 'hour' | 'day',
): Promise<TimeseriesPoint[]> {
  const payload = await get<unknown>(
    '/analytics/timeseries',
    { ...rangeParams(range), fields: 'visitors,pageviews,sessions', interval, limit: 1000 },
    range.ttlMs,
  );
  return rowsOf<TimeseriesPoint>(payload);
}

export async function fetchBreakdown(
  endpoint: string,
  range: RangeParams,
  limit = 20,
): Promise<BreakdownRow[]> {
  const payload = await get<unknown>(`/analytics/${endpoint}`, { ...rangeParams(range), limit }, range.ttlMs);
  return rowsOf<BreakdownRow>(payload);
}

export async function fetchGoals(range: RangeParams): Promise<GoalRow[]> {
  const payload = await get<unknown>(
    '/analytics/goals',
    { ...rangeParams(range), fields: 'name,completions,visitors', limit: 100 },
    range.ttlMs,
  );
  return rowsOf<GoalRow>(payload);
}

/** Realtime is a fixed 10-minute window on DataFast's side — not configurable. */
export async function fetchLiveCount(ttlMs: number): Promise<number> {
  const payload = await get<unknown>('/analytics/realtime', {}, ttlMs);
  const row = firstOf<{ visitors?: number }>(payload);
  return typeof row?.visitors === 'number' ? row.visitors : 0;
}

export async function fetchLiveVisitors(ttlMs: number): Promise<LiveVisitor[]> {
  const payload = await get<unknown>('/analytics/realtime/map', {}, ttlMs);
  return rowsOf<LiveVisitor>(payload, 'visitors');
}
