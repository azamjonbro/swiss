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
  // Supplied by `timestamps: true`; declared so sitemap lastmod can read them.
  createdAt?: Date;
  updatedAt?: Date;
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
    // No default. Country of origin is a provenance claim shown on the brand
    // page and in the maison strip on the home page; defaulting it to
    // Switzerland stamped that claim onto every brand ever created, whether or
    // not it was true. An empty string means "not recorded", and the UI simply
    // omits the line.
    country: { type: String, default: '' },
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
