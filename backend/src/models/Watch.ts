import { Schema, model, Document, Types } from 'mongoose';

export interface IWatchVariant {
  colorSlug: string;
  colorLabel: string;
  colorLabelRu?: string;
  colorLabelUz?: string;
  images: string[];
  videos: string[];
}

export interface IWatch extends Document {
  brand: Types.ObjectId;
  name: string;
  slug: string;
  reference: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  type: 'watch' | 'accessory';
  // A women's edition can sit inside a men's series (Light Matter TB8223 ships in
  // both), so the audience is a property of the watch, not only of its collection.
  gender: 'men' | 'women';
  variants: IWatchVariant[];
  category: Types.ObjectId;
  collectionRef?: Types.ObjectId;
  movement: string;
  caseMaterial: string;
  caseSize: string;
  dial: string;
  bracelet: string;
  waterResistance: string;
  availability: 'in-stock' | 'reserved' | 'sold' | 'made-to-order';
  featured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  // Accessories only: the watches they fit ("pair it with" on the product page).
  compatibleWith: Types.ObjectId[];
  // Curated cross-links surfaced under "You may also like".
  relatedWatches: Types.ObjectId[];
  translations?: {
    ru?: { name?: string; description?: string; shortDescription?: string };
    uz?: { name?: string; description?: string; shortDescription?: string };
  };
  // Supplied by `timestamps: true`; declared so sitemap lastmod can read them.
  createdAt?: Date;
  updatedAt?: Date;
}

const LocalizedWatchFields = {
  name: { type: String },
  description: { type: String },
  shortDescription: { type: String },
};

const WatchVariantSchema = new Schema<IWatchVariant>(
  {
    colorSlug: { type: String, required: true },
    colorLabel: { type: String, default: '' },
    colorLabelRu: { type: String },
    colorLabelUz: { type: String },
    images: [{ type: String }],
    videos: [{ type: String }],
  },
  { _id: false },
);

const WatchSchema = new Schema<IWatch>(
  {
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    reference: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    type: { type: String, enum: ['watch', 'accessory'], default: 'watch', index: true },
    gender: { type: String, enum: ['men', 'women'], default: 'men', index: true },
    variants: {
      type: [WatchVariantSchema],
      validate: {
        validator: (v: IWatchVariant[]) => Array.isArray(v) && v.length > 0,
        message: 'A product needs at least one variant (colorway) with media.',
      },
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    collectionRef: { type: Schema.Types.ObjectId, ref: 'Collection' },
    movement: { type: String, default: '' },
    caseMaterial: { type: String, default: '' },
    caseSize: { type: String, default: '' },
    dial: { type: String, default: '' },
    bracelet: { type: String, default: '' },
    waterResistance: { type: String, default: '' },
    availability: {
      type: String,
      enum: ['in-stock', 'reserved', 'sold', 'made-to-order'],
      default: 'in-stock',
    },
    featured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    compatibleWith: [{ type: Schema.Types.ObjectId, ref: 'Watch' }],
    relatedWatches: [{ type: Schema.Types.ObjectId, ref: 'Watch' }],
    translations: {
      ru: LocalizedWatchFields,
      uz: LocalizedWatchFields,
    },
  },
  { timestamps: true },
);

WatchSchema.index({ name: 'text', reference: 'text', shortDescription: 'text', 'variants.colorLabel': 'text' });

export const Watch = model<IWatch>('Watch', WatchSchema);
