/**
 * Admin analytics, assembled from DataFast.
 *
 * Two endpoints serve the whole page. `summary` is one request that fans out
 * to every DataFast breakdown in parallel and returns a single payload, so
 * opening the dashboard costs the admin panel one round trip rather than
 * eleven; `live` is the small one the page polls on a timer.
 *
 * Nothing here invents a figure. Where DataFast does not publish a metric —
 * exit pages, pageviews per page, a configurable "active now" window — the
 * field is simply absent and the UI says so, rather than showing a number
 * derived from something else and hoping nobody checks.
 */
import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import {
  BreakdownRow,
  GoalRow,
  isConfigured,
  fetchBreakdown,
  fetchGoals,
  fetchLiveCount,
  fetchLiveVisitors,
  fetchOverview,
  fetchTimeseries,
} from '../services/datafast';

/** Freshly-changing data. Matches the poll interval the admin panel uses. */
const TTL_LIVE = 15_000;
/** A range that includes today is still being written to. */
const TTL_TODAY = 60_000;
/** A range that ended in the past cannot change again. */
const TTL_PAST = 60 * 60_000;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Longer than DataFast's shortest retention; anything beyond is a typo. */
const MAX_RANGE_DAYS = 400;

/**
 * "Today" in the boutique's timezone, not the server's.
 *
 * `en-CA` is the shortest route to a `YYYY-MM-DD` string for an arbitrary IANA
 * zone — it is the locale whose short date format already is ISO.
 */
function todayInSiteZone(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.datafast.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

interface Range {
  startAt: string;
  endAt: string;
  ttlMs: number;
}

/**
 * Validates the requested window and decides how long its answer may be cached.
 *
 * The query string is never passed through to DataFast unchecked — both bounds
 * have to be plain calendar dates, in order, inside a sane span.
 */
function resolveRange(req: Request): Range {
  const today = todayInSiteZone();
  const rawFrom = String(req.query.from ?? '').trim();
  const rawTo = String(req.query.to ?? '').trim();

  const startAt = rawFrom || shiftDays(today, -6);
  const endAt = rawTo || today;

  if (!DATE.test(startAt) || !DATE.test(endAt)) {
    throw new ApiError(400, 'from and to must be dates in YYYY-MM-DD form.');
  }
  if (Number.isNaN(Date.parse(`${startAt}T00:00:00Z`)) || Number.isNaN(Date.parse(`${endAt}T00:00:00Z`))) {
    throw new ApiError(400, 'from and to must be real calendar dates.');
  }
  const span = daysBetween(startAt, endAt);
  if (span < 0) throw new ApiError(400, 'from must not be later than to.');
  if (span > MAX_RANGE_DAYS) throw new ApiError(400, `The range must not exceed ${MAX_RANGE_DAYS} days.`);

  // Only a window that has already closed is safe to hold for an hour.
  return { startAt, endAt, ttlMs: endAt >= today ? TTL_TODAY : TTL_PAST };
}

/* ------------------------------------------------------------------ *
 * Row normalisation                                                   *
 * ------------------------------------------------------------------ */

export interface Slice {
  label: string;
  visitors: number;
}

/** Metric columns every breakdown carries; never the row's own name. */
const METRIC_FIELDS = new Set(['visitors', 'revenue', 'payments', 'completions', 'conversion_rate']);

/**
 * Reduces a breakdown row to a label and a number.
 *
 * `preferred` names the column that labels the row for this endpoint
 * (`country`, `browser`, `path`, …). It is tried first and the first
 * remaining string field is the fallback, so an endpoint that labels its rows
 * under a name not listed here still renders instead of coming out blank.
 */
function toSlices(rows: BreakdownRow[], preferred: string[]): Slice[] {
  return rows
    .map((row) => {
      let label = '';
      for (const key of preferred) {
        const value = row[key];
        if (typeof value === 'string' && value.trim()) {
          label = value.trim();
          break;
        }
      }
      if (!label) {
        for (const [key, value] of Object.entries(row)) {
          if (METRIC_FIELDS.has(key)) continue;
          if (typeof value === 'string' && value.trim()) {
            label = value.trim();
            break;
          }
        }
      }
      return { label: label || 'Unknown', visitors: Number(row.visitors ?? 0) };
    })
    .filter((slice) => slice.visitors > 0)
    .sort((a, b) => b.visitors - a.visitors);
}

/* ------------------------------------------------------------------ *
 * Traffic channels                                                    *
 * ------------------------------------------------------------------ */

export type Channel = 'direct' | 'organic' | 'social' | 'referral';

const SEARCH_ENGINES = ['google', 'bing', 'yandex', 'duckduckgo', 'yahoo', 'baidu', 'ecosia', 'brave'];
const SOCIAL_NETWORKS = [
  'instagram',
  'facebook',
  'fb.com',
  'messenger',
  't.me',
  'telegram',
  'twitter',
  'x.com',
  'youtube',
  'tiktok',
  'vk.com',
  'linkedin',
  'pinterest',
  'reddit',
  'threads',
];

/**
 * Groups DataFast's raw referrer rows into marketing channels.
 *
 * DataFast does not publish a channel taxonomy — its referrers endpoint
 * returns literal rows like "Google", "Direct / None" and "instagram.com".
 * This is a classification of those rows, not a new measurement: every
 * visitor counted here was counted by DataFast first, and the response labels
 * the block `derived` so the UI can say where the grouping came from.
 */
function classify(label: string): Channel {
  const value = label.toLowerCase();
  if (!value || value.includes('direct') || value === 'none' || value === 'unknown') return 'direct';
  if (SEARCH_ENGINES.some((engine) => value.includes(engine))) return 'organic';
  if (SOCIAL_NETWORKS.some((network) => value.includes(network))) return 'social';
  return 'referral';
}

function toChannels(referrers: Slice[]): Slice[] {
  const totals = new Map<Channel, number>();
  for (const row of referrers) {
    const channel = classify(row.label);
    totals.set(channel, (totals.get(channel) ?? 0) + row.visitors);
  }
  return [...totals.entries()]
    .map(([label, visitors]) => ({ label, visitors }))
    .sort((a, b) => b.visitors - a.visitors);
}

function toGoals(rows: GoalRow[]): { label: string; completions: number; visitors: number }[] {
  return rows
    .map((row) => ({
      label: String(row.goal ?? row.name ?? 'unknown'),
      completions: Number(row.completions ?? 0),
      visitors: Number(row.visitors ?? 0),
    }))
    .sort((a, b) => b.completions - a.completions);
}

/* ------------------------------------------------------------------ *
 * Endpoints                                                           *
 * ------------------------------------------------------------------ */

function requireConfigured() {
  if (!isConfigured()) {
    throw new ApiError(
      503,
      'Analytics is not configured. Set DATAFAST_API_KEY on the server.',
      'DATAFAST_NOT_CONFIGURED',
    );
  }
}

/**
 * Runs every section, tolerating partial failure.
 *
 * A single breakdown timing out should cost the dashboard that one panel, not
 * the whole page — so results are settled individually and the names of the
 * sections that failed are returned alongside the data. If *everything*
 * failed the cause is upstream (bad key, provider down) and the original
 * error is rethrown instead of rendering an empty dashboard as if it were
 * a quiet day.
 */
async function settleSections<T extends Record<string, Promise<unknown>>>(
  sections: T,
): Promise<{ values: { [K in keyof T]: Awaited<T[K]> | null }; failed: string[] }> {
  const names = Object.keys(sections) as (keyof T & string)[];
  const settled = await Promise.allSettled(names.map((name) => sections[name]));

  const values = {} as { [K in keyof T]: Awaited<T[K]> | null };
  const failed: string[] = [];
  let firstError: unknown = null;

  settled.forEach((result, index) => {
    const name = names[index];
    if (result.status === 'fulfilled') {
      values[name] = result.value as Awaited<T[typeof name]>;
    } else {
      values[name] = null;
      failed.push(name);
      firstError ??= result.reason;
    }
  });

  if (failed.length === names.length && firstError) throw firstError;
  return { values, failed };
}

export async function getAnalyticsSummary(req: Request, res: Response) {
  requireConfigured();
  const range = resolveRange(req);

  // A single day is only legible hour by hour; anything longer is read as days.
  const interval = range.startAt === range.endAt ? 'hour' : 'day';

  const { values, failed } = await settleSections({
    overview: fetchOverview(range),
    timeseries: fetchTimeseries(range, interval),
    referrers: fetchBreakdown('referrers', range, 50),
    campaigns: fetchBreakdown('campaigns', range),
    pages: fetchBreakdown('pages', range),
    countries: fetchBreakdown('countries', range),
    cities: fetchBreakdown('cities', range),
    devices: fetchBreakdown('devices', range),
    browsers: fetchBreakdown('browsers', range),
    operatingSystems: fetchBreakdown('operating-systems', range),
    goals: fetchGoals(range),
  });

  const referrers = toSlices(values.referrers ?? [], ['referrer', 'source']);

  res.json({
    range: { from: range.startAt, to: range.endAt, timezone: env.datafast.timezone, interval },
    // Names the panels that could not be loaded, so the UI can mark those and
    // only those as unavailable instead of showing them as zero.
    unavailable: failed,
    overview: values.overview ?? null,
    timeseries: values.timeseries ?? [],
    referrers,
    // Grouped by us from the rows above — see `classify`.
    channels: toChannels(referrers),
    campaigns: toSlices(values.campaigns ?? [], ['campaign', 'utm_campaign', 'utm_source', 'name']),
    // DataFast reports visitors per page, not pageviews and not time on page.
    pages: toSlices(values.pages ?? [], ['path', 'page', 'url']),
    countries: toSlices(values.countries ?? [], ['country', 'countryName', 'name']),
    cities: toSlices(values.cities ?? [], ['city', 'name']),
    devices: toSlices(values.devices ?? [], ['device', 'name']),
    browsers: toSlices(values.browsers ?? [], ['browser', 'name']),
    operatingSystems: toSlices(values.operatingSystems ?? [], ['os', 'operatingSystem', 'name']),
    goals: toGoals(values.goals ?? []),
  });
}

export async function getAnalyticsLive(_req: Request, res: Response) {
  requireConfigured();

  const { values, failed } = await settleSections({
    count: fetchLiveCount(TTL_LIVE),
    visitors: fetchLiveVisitors(TTL_LIVE),
  });

  const visitors = (values.visitors ?? []).map((visitor) => ({
    id: visitor.visitorId ?? null,
    url: visitor.currentUrl ?? null,
    country: visitor.location?.country ?? visitor.location?.countryCode ?? null,
    city: visitor.location?.city ?? null,
    device: visitor.system?.device ?? null,
    browser: visitor.system?.browser ?? null,
    os: visitor.system?.os ?? null,
    // DataFast's realtime map reports when the session began; `lastSeenAt` is
    // only on the visitors endpoint. Both are passed through as-is so the UI
    // can label whichever it actually received rather than implying accuracy
    // it does not have.
    sessionStartedAt: visitor.sessionStartedAt ?? null,
    lastSeenAt: visitor.lastSeenAt ?? null,
  }));

  res.json({
    // Fixed by DataFast at ten minutes and not configurable; sent so the UI
    // can label the panel honestly instead of implying "right now".
    windowMinutes: 10,
    count: values.count ?? visitors.length,
    visitors,
    unavailable: failed,
  });
}
