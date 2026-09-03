import { Schema, model, Document } from 'mongoose';

/**
 * One visit to the storefront.
 *
 * This is the workhorse of the analytics dashboard: visitors, sessions, bounce
 * rate, session duration, new-versus-returning, traffic sources, geography and
 * devices are all answered from this collection alone, because every one of
 * those is a property of the *visit* rather than of an individual page.
 * Page-level questions go to AnalyticsEvent instead.
 *
 * Nothing here identifies a person. The visitor id is a random value the
 * browser generates for itself, the raw IP address is never written down — it
 * is read once to derive a country and then discarded — and no name, email or
 * account is ever attached. That is what lets the storefront track visits
 * without a cookie banner.
 */
export interface IAnalyticsSession extends Document {
  /** Random id from the visitor's browser, stable across sessions. */
  visitorId: string;
  /** Random id for this visit; a new one is minted after 30 minutes idle. */
  sessionId: string;
  startedAt: Date;
  lastSeenAt: Date;
  pageviews: number;
  entryPath: string;
  exitPath: string;
  /** The referring URL as the browser reported it; '' means a direct arrival. */
  referrer: string;
  /** Derived from `referrer` and the UTM tags — see utils/channel.ts. */
  channel: 'direct' | 'organic' | 'social' | 'referral' | 'campaign';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  country?: string;
  city?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  /**
   * True when this visitor had no earlier session at the time it began.
   *
   * Named `isNewVisitor` rather than `isNew` because Mongoose reserves `isNew`
   * on every Document for its own "not yet saved" flag — a field of that name
   * is rejected by the schema.
   */
  isNewVisitor: boolean;
}

const AnalyticsSessionSchema = new Schema<IAnalyticsSession>(
  {
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true, unique: true },
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    // A session that never got past its first page is a bounce, so this count
    // is what the bounce rate is computed from.
    pageviews: { type: Number, default: 0 },
    entryPath: { type: String, default: '' },
    exitPath: { type: String, default: '' },
    referrer: { type: String, default: '' },
    channel: {
      type: String,
      enum: ['direct', 'organic', 'social', 'referral', 'campaign'],
      default: 'direct',
    },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    country: { type: String },
    city: { type: String },
    device: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    isNewVisitor: { type: Boolean, default: true },
  },
  { timestamps: false },
);

// Every dashboard query filters on the visit window and sorts by it.
AnalyticsSessionSchema.index({ startedAt: -1 });
// "Who is on the site right now" reads only this.
AnalyticsSessionSchema.index({ lastSeenAt: -1 });
// Deciding whether an arriving visitor is new is one lookup on this index.
AnalyticsSessionSchema.index({ visitorId: 1, startedAt: 1 });

/**
 * Sessions expire after 400 days.
 *
 * Traffic data has to stop growing somewhere: this collection is written to on
 * every visit and nothing ever deletes from it by hand. 400 days keeps a full
 * year of year-on-year comparison and lets Mongo reclaim the rest without
 * anyone remembering to.
 */
AnalyticsSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

export const AnalyticsSession = model<IAnalyticsSession>('AnalyticsSession', AnalyticsSessionSchema);
