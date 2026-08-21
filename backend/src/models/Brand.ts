import { Schema, model, Document } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  slug: string;
  description: string;
  logo: string;
  image: string;
  website?: string;
  country?: string;
  founded?: number;
  featured: boolean;
  isActive: boolean;
  translations?: {
    ru?: { name?: string; description?: string };
    uz?: { name?: string; description?: string };
  };
}

const LocalizedBrandFields = {
  name: { type: String },
  description: { type: String },
};

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    image: { type: String, default: '' },
    website: { type: String, default: '' },
    country: { type: String, default: 'Switzerland' },
    founded: { type: Number },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    translations: {
      ru: LocalizedBrandFields,
      uz: LocalizedBrandFields,
    },
  },
  { timestamps: true },
);

export const Brand = model<IBrand>('Brand', BrandSchema);
