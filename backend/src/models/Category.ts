import { Schema, model, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  image: string;
  video?: string;
  order: number;
  featured: boolean;
  isActive: boolean;
  translations?: {
    ru?: { name?: string; description?: string; tagline?: string };
    uz?: { name?: string; description?: string; tagline?: string };
  };
}

const LocalizedCategoryFields = {
  name: { type: String },
  description: { type: String },
  tagline: { type: String },
};

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    tagline: { type: String, default: '' },
    image: { type: String, default: '' },
    video: { type: String, default: '' },
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    translations: {
      ru: LocalizedCategoryFields,
      uz: LocalizedCategoryFields,
    },
  },
  { timestamps: true },
);

CategorySchema.index({ order: 1 });

export const Category = model<ICategory>('Category', CategorySchema);
