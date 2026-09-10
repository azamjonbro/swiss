import { Schema, model, Document } from 'mongoose';

/**
 * A physical boutique.
 *
 * The storefront already had a shape for this — `frontend/src/data/locations.ts`,
 * a hand-edited JSON file that feeds the /stores page, its `JewelryStore`
 * JSON-LD and the sitemap. This model deliberately mirrors that shape field for
 * field, because the file stays: it is read at *build* time by the prerenderer,
 * and a runtime API cannot be read by a static build. What changes is who
 * writes it — the admin panel now, via `frontend/scripts/sync-locations.mjs`,
 * instead of a person editing JSON.
 *
 * Everything below the name is optional on purpose. A branch that has been
 * opened but not yet surveyed should be listable the day it opens; the
 * consumers all treat absent as "publish nothing" rather than inventing a
 * placeholder — an invented postcode or a guessed coordinate is a worse signal
 * to a search engine than silence.
 */
export interface IBranch extends Document {
  name: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. Every branch is in Uzbekistan today; the field exists so that is a fact, not an assumption. */
  addressCountry: string;
  /** Display forms. The `tel:` href is derived from each. */
  phones: string[];
  /** schema.org opening-hours strings, e.g. `Mo-Sa 10:00-20:00`. Emitted verbatim. */
  openingHours: string[];
  geo?: { latitude: number; longitude: number };
  mapUrl: string;
  /** Ascending. Ties fall back to creation order, so an unordered list is still stable. */
  order: number;
  isActive: boolean;
  translations?: {
    ru?: { name?: string; streetAddress?: string; addressLocality?: string; addressRegion?: string };
    uz?: { name?: string; streetAddress?: string; addressLocality?: string; addressRegion?: string };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const LocalizedBranchFields = {
  name: { type: String },
  streetAddress: { type: String },
  addressLocality: { type: String },
  addressRegion: { type: String },
};

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    streetAddress: { type: String, default: '', trim: true },
    addressLocality: { type: String, default: '', trim: true },
    addressRegion: { type: String, default: '', trim: true },
    postalCode: { type: String, default: '', trim: true },
    addressCountry: { type: String, default: 'UZ', uppercase: true, trim: true },
    phones: { type: [String], default: [] },
    openingHours: { type: [String], default: [] },
    // Not `default: null` on a subdocument: Mongoose would materialise
    // `{ latitude: null, longitude: null }`, which reads as "surveyed, at the
    // origin". Absent has to stay absent.
    geo: {
      type: new Schema({ latitude: { type: Number }, longitude: { type: Number } }, { _id: false }),
      required: false,
    },
    mapUrl: { type: String, default: '', trim: true },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    translations: {
      ru: LocalizedBranchFields,
      uz: LocalizedBranchFields,
    },
  },
  { timestamps: true },
);

export const Branch = model<IBranch>('Branch', BranchSchema);
