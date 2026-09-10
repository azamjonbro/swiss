export type TranslationLang = 'ru' | 'uz';
export const TRANSLATION_LANGS: TranslationLang[] = ['ru', 'uz'];

/**
 * Per-language overrides for the base (English) text fields. The API overlays
 * these onto the document when the storefront asks for `?lang=ru|uz` and falls
 * back to the English value whenever a field is left blank, so partial
 * translations are safe.
 */
export type LocalizedFields = Record<string, string>;

export type Translations = Partial<Record<TranslationLang, LocalizedFields>>;

/** One translatable field, as rendered by TranslationFields.vue. */
export interface TranslationField {
  /** Key inside `translations.<lang>` — must match the model's localized field. */
  key: string;
  label: string;
  type?: 'text' | 'textarea';
  rows?: number;
}

export interface Brand {
  _id: string;
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
  createdAt?: string;
  updatedAt?: string;
  translations?: Translations;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  image: string;
  video?: string;
  order: number;
  featured: boolean;
  isActive: boolean;
  translations?: Translations;
}

/**
 * A physical boutique, as managed here and published by the storefront.
 *
 * Everything below `name` is optional because a branch is often listed the week
 * it opens, before it has been surveyed or given a phone line. Absent stays
 * absent all the way through: the storefront skips the row it would have
 * rendered, and the JSON-LD omits the field rather than shipping a placeholder
 * a crawler would read as fact.
 */
export interface Branch {
  _id: string;
  name: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  addressCountry: string;
  /** Display forms — "+998 88 500 70 00". The `tel:` href is derived from each. */
  phones: string[];
  /** schema.org opening-hours strings, e.g. "Mo-Sa 10:00-20:00". */
  openingHours: string[];
  geo?: { latitude: number; longitude: number } | null;
  mapUrl: string;
  order: number;
  isActive: boolean;
  translations?: Translations;
}

/** One shop question, as the FAQ under every watch on the storefront. */
export interface Faq {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  translations?: Translations;
}

export interface BrandRef {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export type Availability = 'in-stock' | 'reserved' | 'sold' | 'made-to-order';

export type WatchType = 'watch' | 'accessory';

export interface WatchVariant {
  colorSlug: string;
  colorLabel: string;
  colorLabelRu?: string;
  colorLabelUz?: string;
  images: string[];
  videos: string[];
}

export interface Watch {
  _id: string;
  brand: BrandRef | string;
  name: string;
  slug: string;
  modelGroup?: string;
  reference: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  type: WatchType;
  variants: WatchVariant[];
  category: CategoryRef | string;
  collectionRef?: string;
  movement: string;
  caseMaterial: string;
  caseSize: string;
  dial: string;
  bracelet: string;
  waterResistance: string;
  availability: Availability;
  featured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  compatibleWith?: string[];
  relatedWatches?: string[];
  createdAt?: string;
  updatedAt?: string;
  translations?: Translations;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  watches: Watch[] | string[];
  featured: boolean;
  isActive: boolean;
  translations?: Translations;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export type InquiryStatus = 'new' | 'contacted' | 'completed' | 'cancelled';

export interface Inquiry {
  _id: string;
  name: string;
  phone: string;
  email: string;
  watch?: { _id: string; name: string; slug: string } | string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin';
}
