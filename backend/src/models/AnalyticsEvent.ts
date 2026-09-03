import { Schema, model, Document } from 'mongoose';

/**
 * A single thing that happened during a visit: a page opened, or a goal met.
 *
 * Kept separate from AnalyticsSession because the questions differ. A session
 * answers "how many people came, from where, on what"; an event answers "which
 * pages did they read and what did they do". Rolling both into one document
 * would mean either an unbounded array per session or re-reading every session
 * to count pages.
 *
 * The goal names are a closed set (see GOAL_TYPES) so a bug in the storefront
 * cannot fill the collection with junk types that then need cleaning out of
 * every chart.
 */

/** Everything the storefront is allowed to report. Anything else is dropped. */
export const GOAL_TYPES = [
  'add_to_cart',
  'remove_from_cart',
  'checkout_start',
  'inquiry_submitted',
  'phone_click',
  'email_click',
  'instagram_click',
  'product_saved',
  'search',
] as const;

export const EVENT_TYPES = ['pageview', ...GOAL_TYPES] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface IAnalyticsEvent extends Document {
  visitorId: string;
  sessionId: string;
  type: EventType;
  /** Path only — never the full URL, so query strings can't smuggle in PII. */
  path: string;
  /** Set on product-related events so the dashboard can rank products. */
  productSlug?: string;
  ts: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    path: { type: String, default: '' },
    productSlug: { type: String },
    ts: { type: Date, required: true },
  },
  { timestamps: false },
);

// Top pages and the conversion table both scan a date window by type.
AnalyticsEventSchema.index({ ts: -1 });
AnalyticsEventSchema.index({ type: 1, ts: -1 });
AnalyticsEventSchema.index({ path: 1, ts: -1 });

/**
 * Events expire after 90 days.
 *
 * Far more numerous than sessions — several per visit — and the questions they
 * answer ("which pages are being read this quarter") are current ones. The
 * long-range trend lives in the session collection, which is kept for 400 days.
 */
AnalyticsEventSchema.index({ ts: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
