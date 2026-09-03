import { Request, Response } from 'express';
import { PipelineStage } from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { AnalyticsSession } from '../models/AnalyticsSession';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { referrerLabel } from '../utils/channel';

/**
 * The read side of the analytics dashboard.
 *
 * Two endpoints serve the whole page: `summary` for a date range and `live`
 * for who is on the site now. Everything is aggregated straight from the two
 * analytics collections — at this catalogue's traffic the indexed aggregations
 * answer in milliseconds, and a pre-computed daily rollup would be a second
 * source of truth to keep correct for no gain yet. If traffic ever makes that
 * untrue, the place to add one is here, behind this same response shape.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 400;
/** How recently a visitor must have been active to count as here right now. */
const LIVE_WINDOW_MINUTES = 5;

interface Range {
  from: string;
  to: string;
  start: Date;
  end: Date;
  interval: 'hour' | 'day';
}

function todayInSiteZone(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.analyticsTimezone,
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

/**
 * The UTC instant at which a local calendar day begins.
 *
 * A day in Tashkent is not a day in UTC, and the visits are stored in UTC. The
 * offset is measured for that specific date rather than assumed, so the
 * boundary stays right across a DST change in any timezone this is pointed at.
 */
function zonedDayStart(date: string, timeZone: string): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  const asLocal = new Date(guess.toLocaleString('en-US', { timeZone }));
  const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess.getTime() - (asLocal.getTime() - asUtc.getTime()));
}

function resolveRange(req: Request): Range {
  const today = todayInSiteZone();
  const from = String(req.query.from ?? '').trim() || shiftDays(today, -6);
  const to = String(req.query.to ?? '').trim() || today;

  if (!DATE.test(from) || !DATE.test(to)) {
    throw new ApiError(400, 'from and to must be dates in YYYY-MM-DD form.');
  }
  const span = Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (Number.isNaN(span)) throw new ApiError(400, 'from and to must be real calendar dates.');
  if (span < 0) throw new ApiError(400, 'from must not be later than to.');
  if (span > MAX_RANGE_DAYS) throw new ApiError(400, `The range must not exceed ${MAX_RANGE_DAYS} days.`);

  return {
    from,
    to,
    start: zonedDayStart(from, env.analyticsTimezone),
    // `to` is inclusive, so the window runs to the start of the following day.
    end: zonedDayStart(shiftDays(to, 1), env.analyticsTimezone),
    // A single day only reads hour by hour; anything longer reads as days.
    interval: span === 0 ? 'hour' : 'day',
  };
}

/* ------------------------------------------------------------------ *
 * Aggregation helpers                                                 *
 * ------------------------------------------------------------------ */

interface Slice {
  label: string;
  visitors: number;
  views?: number;
}

/**
 * Ranks sessions by one of their fields, counting distinct visitors per group.
 *
 * Distinct visitors rather than sessions: a person who comes back twice from
 * Instagram is one visitor from Instagram, and counting sessions would make
 * every channel look busier than it is.
 */
async function sessionBreakdown(range: Range, field: string, limit = 20): Promise<Slice[]> {
  const rows = await AnalyticsSession.aggregate<{ _id: string | null; visitors: string[] }>([
    { $match: { startedAt: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: `$${field}`, visitors: { $addToSet: '$visitorId' } } },
  ]);

  return rows
    .map((row) => ({ label: row._id || 'Unknown', visitors: row.visitors.length }))
    .filter((row) => row.visitors > 0)
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, limit);
}

/** Same, but the label needs deriving from the stored value first. */
async function referrerBreakdown(range: Range, limit = 20): Promise<Slice[]> {
  const rows = await AnalyticsSession.aggregate<{ _id: string | null; visitors: string[] }>([
    { $match: { startedAt: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: '$referrer', visitors: { $addToSet: '$visitorId' } } },
  ]);

  const merged = new Map<string, Set<string>>();
  for (const row of rows) {
    const label = referrerLabel(row._id ?? '');
    const bucket = merged.get(label) ?? new Set<string>();
    row.visitors.forEach((visitor) => bucket.add(visitor));
    merged.set(label, bucket);
  }

  return [...merged.entries()]
    .map(([label, visitors]) => ({ label, visitors: visitors.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, limit);
}

/** Top pages, by views and by the number of distinct people who saw them. */
async function pageBreakdown(range: Range, limit = 12): Promise<Slice[]> {
  const rows = await AnalyticsEvent.aggregate<{ _id: string; views: number; visitors: string[] }>([
    { $match: { type: 'pageview', ts: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: '$path', views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({ label: row._id || '/', visitors: row.visitors.length, views: row.views }));
}

async function goalBreakdown(range: Range) {
  const rows = await AnalyticsEvent.aggregate<{ _id: string; completions: number; visitors: string[] }>([
    { $match: { type: { $ne: 'pageview' }, ts: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: '$type', completions: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
    { $sort: { completions: -1 } },
  ]);

  return rows.map((row) => ({ label: row._id, completions: row.completions, visitors: row.visitors.length }));
}

/* ------------------------------------------------------------------ *
 * Overview and time series                                            *
 * ------------------------------------------------------------------ */

async function buildOverview(range: Range) {
  const [row] = await AnalyticsSession.aggregate<{
    sessions: number;
    visitors: string[];
    pageviews: number;
    newSessions: number;
    bounced: number;
    totalDurationMs: number;
  }>([
    { $match: { startedAt: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
        pageviews: { $sum: '$pageviews' },
        newSessions: { $sum: { $cond: ['$isNewVisitor', 1, 0] } },
        // A visit that never went past its first page is a bounce.
        bounced: { $sum: { $cond: [{ $lte: ['$pageviews', 1] }, 1, 0] } },
        totalDurationMs: { $sum: { $subtract: ['$lastSeenAt', '$startedAt'] } },
      },
    },
  ]);

  if (!row || !row.sessions) {
    return {
      visitors: 0,
      new_visitors: 0,
      returning_visitors: 0,
      pageviews: 0,
      sessions: 0,
      bounce_rate: 0,
      avg_session_duration: 0,
      visitorBreakdown: { new: 0, returning: 0, newPercentage: 0, returningPercentage: 0 },
    };
  }

  const newVisitors = row.newSessions;
  const returning = row.sessions - row.newSessions;

  return {
    visitors: row.visitors.length,
    new_visitors: newVisitors,
    returning_visitors: returning,
    pageviews: row.pageviews,
    sessions: row.sessions,
    bounce_rate: Number(((row.bounced / row.sessions) * 100).toFixed(1)),
    avg_session_duration: Math.round(row.totalDurationMs / row.sessions / 1000),
    visitorBreakdown: {
      new: newVisitors,
      returning,
      newPercentage: Number(((newVisitors / row.sessions) * 100).toFixed(1)),
      returningPercentage: Number(((returning / row.sessions) * 100).toFixed(1)),
    },
  };
}

/**
 * Visitors, sessions and pageviews per bucket.
 *
 * Buckets are cut in the site's timezone with `$dateToString`, which every
 * supported MongoDB understands — `$dateTrunc` would be tidier but needs 5.0,
 * and this has to run on whatever the VPS is on. The key it produces is a
 * local wall-clock time, so it is handed back with a `Z` and rendered as UTC
 * by the chart: formatting it in any other zone would shift the bucket away
 * from the day it was counted in.
 */
async function buildTimeseries(range: Range) {
  const format = range.interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%dT00:00:00';

  const rows = await AnalyticsSession.aggregate<{ _id: string; sessions: number; visitors: string[]; pageviews: number }>([
    { $match: { startedAt: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$startedAt', timezone: env.analyticsTimezone } },
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
        pageviews: { $sum: '$pageviews' },
      },
    },
    { $sort: { _id: 1 } },
  ] as PipelineStage[]);

  const found = new Map(rows.map((row) => [row._id, row]));

  // Days with no traffic are part of the shape of the chart: without them the
  // line would join two busy days across a quiet week as if it never dipped.
  return bucketKeys(range).map((key) => {
    const row = found.get(key);
    return {
      timestamp: `${key}Z`,
      visitors: row ? row.visitors.length : 0,
      sessions: row?.sessions ?? 0,
      pageviews: row?.pageviews ?? 0,
    };
  });
}

/** Every bucket the range covers, in order, whether or not anyone visited. */
function bucketKeys(range: Range): string[] {
  const keys: string[] = [];

  if (range.interval === 'hour') {
    for (let hour = 0; hour < 24; hour += 1) {
      keys.push(`${range.from}T${String(hour).padStart(2, '0')}:00:00`);
    }
    return keys;
  }

  let cursor = range.from;
  // The bound is the loop's own safety net, not a business rule: `to` is
  // already validated to be at most MAX_RANGE_DAYS after `from`.
  for (let i = 0; i <= MAX_RANGE_DAYS && cursor <= range.to; i += 1) {
    keys.push(`${cursor}T00:00:00`);
    cursor = shiftDays(cursor, 1);
  }
  return keys;
}

/* ------------------------------------------------------------------ *
 * Endpoints                                                           *
 * ------------------------------------------------------------------ */

export async function getAnalyticsSummary(req: Request, res: Response) {
  const range = resolveRange(req);

  const [
    overview,
    timeseries,
    channels,
    referrers,
    campaigns,
    pages,
    entryPages,
    exitPages,
    countries,
    cities,
    devices,
    browsers,
    operatingSystems,
    goals,
  ] = await Promise.all([
    buildOverview(range),
    buildTimeseries(range),
    sessionBreakdown(range, 'channel', 6),
    referrerBreakdown(range),
    sessionBreakdown(range, 'utmCampaign'),
    pageBreakdown(range),
    sessionBreakdown(range, 'entryPath', 10),
    sessionBreakdown(range, 'exitPath', 10),
    sessionBreakdown(range, 'country'),
    sessionBreakdown(range, 'city'),
    sessionBreakdown(range, 'device', 4),
    sessionBreakdown(range, 'browser', 8),
    sessionBreakdown(range, 'os', 8),
    goalBreakdown(range),
  ]);

  res.json({
    range: { from: range.from, to: range.to, timezone: env.analyticsTimezone, interval: range.interval },
    // Kept for the UI's per-panel failure states; nothing partially fails when
    // every figure comes from our own database.
    unavailable: [],
    overview,
    timeseries,
    channels,
    referrers,
    campaigns,
    pages,
    entryPages,
    exitPages,
    countries,
    cities,
    devices,
    browsers,
    operatingSystems,
    goals,
  });
}

export async function getAnalyticsLive(_req: Request, res: Response) {
  const since = new Date(Date.now() - LIVE_WINDOW_MINUTES * 60_000);

  const sessions = await AnalyticsSession.find({ lastSeenAt: { $gte: since } })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .lean();

  res.json({
    windowMinutes: LIVE_WINDOW_MINUTES,
    count: sessions.length,
    visitors: sessions.map((session) => ({
      id: session.sessionId,
      url: session.exitPath || session.entryPath || '/',
      country: session.country ?? null,
      city: session.city ?? null,
      device: session.device ?? null,
      browser: session.browser ?? null,
      os: session.os ?? null,
      sessionStartedAt: session.startedAt?.toISOString() ?? null,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
    })),
    unavailable: [],
  });
}
