import { Schema, model, Document, Types } from 'mongoose';

export interface IWatch extends Document {
  brand: Types.ObjectId;
  name: string;
  slug: string;
  reference: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  images: string[];
  videos: string[];
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
  translations?: {
    ru?: { name?: string; description?: string; shortDescription?: string };
    uz?: { name?: string; description?: string; shortDescription?: string };
  };
}

const LocalizedWatchFields = {
  name: { type: String },
  description: { type: String },
  shortDescription: { type: String },
};

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
    images: [{ type: String }],
    videos: [{ type: String }],
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
    translations: {
      ru: LocalizedWatchFields,
      uz: LocalizedWatchFields,
    },
  },
  { timestamps: true },
);

WatchSchema.index({ name: 'text', reference: 'text', shortDescription: 'text' });

export const Watch = model<IWatch>('Watch', WatchSchema);
