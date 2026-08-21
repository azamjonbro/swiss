import { Schema, model, Document, Types } from 'mongoose';

export interface ICollection extends Document {
  name: string;
  slug: string;
  description: string;
  image: string;
  watches: Types.ObjectId[];
  featured: boolean;
  isActive: boolean;
  translations?: {
    ru?: { name?: string; description?: string };
    uz?: { name?: string; description?: string };
  };
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
