import { Schema, model, Document } from 'mongoose';

/**
 * One question a visitor asks before buying, with the shop's answer.
 *
 * These are *shop* questions — delivery, warranty, authenticity, servicing —
 * not product ones, so a single list is shown on every product page rather
 * than a per-watch list nobody would keep up to date across 900 documents.
 *
 * Like `Branch`, the storefront reads this at build time as well as at
 * runtime: the prerenderer writes the answers into the crawlable copy of each
 * product page, so an edit here is public after the deploy the controller
 * schedules. Ordering is explicit because a FAQ list has a deliberate reading
 * order — the question everyone asks belongs first, not whichever was typed
 * first.
 */
export interface IFaq extends Document {
  question: string;
  answer: string;
  /** Ascending. Ties fall back to creation order, so an unordered list is still stable. */
  order: number;
  isActive: boolean;
  translations?: {
    ru?: { question?: string; answer?: string };
    uz?: { question?: string; answer?: string };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const LocalizedFaqFields = {
  question: { type: String },
  answer: { type: String },
};

const FaqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    translations: {
      ru: LocalizedFaqFields,
      uz: LocalizedFaqFields,
    },
  },
  { timestamps: true },
);

export const Faq = model<IFaq>('Faq', FaqSchema);
