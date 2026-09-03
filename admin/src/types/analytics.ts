/**
 * Shapes returned by `/api/admin/analytics/*`.
 *
 * The figures come from this project's own database — the `analyticssessions`
 * and `analyticsevents` collections the storefront's beacon writes to — so
 * every field here is one the backend actually computes.
 */

/** One row of a ranked breakdown: a name and how many visitors it accounts for. */
export interface Slice {
  label: string;
  visitors: number;
  /** Total views, on breakdowns where a page can be seen more than once. */
  views?: number;
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
  /** Kept for per-panel failure states; always empty while data is local. */
  unavailable: string[];
  overview: Overview | null;
  timeseries: TimeseriesPoint[];
  referrers: Slice[];
  channels: Slice[];
  campaigns: Slice[];
  pages: Slice[];
  /** The page a visit started on. */
  entryPages: Slice[];
  /** The last page of a visit — where people leave. */
  exitPages: Slice[];
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
  /** How recently a visitor must have acted to count as here now. */
  windowMinutes: number;
  count: number;
  visitors: LiveVisitor[];
  unavailable: string[];
}

/** The presets the range picker offers, plus the custom case. */
export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';
