/**
 * Shapes returned by `/api/admin/analytics/*`.
 *
 * These mirror what the backend actually assembles from DataFast — no more.
 * Fields DataFast does not publish (pageviews per page, exit pages, time on
 * page) are absent here on purpose, so a component cannot bind to a number
 * that will never arrive.
 */

/** One row of a ranked breakdown: a name and how many visitors it accounts for. */
export interface Slice {
  label: string;
  visitors: number;
}

export interface GoalSlice {
  label: string;
  completions: number;
  visitors: number;
}

export interface Overview {
  visitors?: number;
  new_visitors?: number;
  returning_visitors?: number;
  pageviews?: number;
  sessions?: number;
  /** Percentage, 0–100. */
  bounce_rate?: number;
  /** Seconds. */
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

export interface AnalyticsSummary {
  range: { from: string; to: string; timezone: string; interval: 'hour' | 'day' };
  /** Section names that failed upstream; those panels show as unavailable. */
  unavailable: string[];
  overview: Overview | null;
  timeseries: TimeseriesPoint[];
  referrers: Slice[];
  /** Grouped by our backend from the referrer rows, not measured by DataFast. */
  channels: Slice[];
  campaigns: Slice[];
  pages: Slice[];
  countries: Slice[];
  cities: Slice[];
  devices: Slice[];
  browsers: Slice[];
  operatingSystems: Slice[];
  goals: GoalSlice[];
}

export interface LiveVisitor {
  id: string | null;
  url: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  sessionStartedAt: string | null;
  lastSeenAt: string | null;
}

export interface AnalyticsLive {
  /** DataFast counts a visitor active for this many minutes. Fixed at 10. */
  windowMinutes: number;
  count: number;
  visitors: LiveVisitor[];
  unavailable: string[];
}

/** The presets the range picker offers, plus the custom case. */
export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';
