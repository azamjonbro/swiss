import { Schema, model, Document, Types } from 'mongoose';

export interface ICollection extends Document {
  name: string;
  slug: string;
  description: string;
  image: string;
  // Tsar Bomba splits its line-up by audience: eight men's series plus Nucleus Femme.
  gender: 'men' | 'women';
  watches: Types.ObjectId[];
  featured: boolean;
  isActive: boolean;
  translations?: {
    ru?: { name?: string; description?: string };
    uz?: { name?: string; description?: string };
  };
  // Supplied by `timestamps: true`; declared so sitemap lastmod can read them.
  createdAt?: Date;
  updatedAt?: Date;
}

const LocalizedCollectionFields = {
  name: { type: String },
  description: { type: String },
};

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    gender: { type: String, enum: ['men', 'women'], default: 'men', index: true },
    watches: [{ type: Schema.Types.ObjectId, ref: 'Watch' }],
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    translations: {
      ru: LocalizedCollectionFields,
      uz: LocalizedCollectionFields,
    },
  },
  { timestamps: true },
);

export const Collection = model<ICollection>('Collection', CollectionSchema);
