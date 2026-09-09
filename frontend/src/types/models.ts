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
  images: string[];
  videos: string[];
}

/**
 * One colourway of a model, as the listing and the product page see the others.
 *
 * A maison publishes each dial colour as its own product — the PRX 40mm comes
 * in twenty-one — so the catalogue holds one document per colourway and the
 * grid used to draw one card per colourway too. The API now returns them
 * grouped: one card per model, carrying the rest of the run in `siblings`, so
 * the card can show the whole colour range and a "from" price, and the product
 * page can offer the other colours. Each is a real product with its own price,
 * spec sheet and URL — selecting one navigates to it.
 */
export interface WatchSibling {
  _id: string;
  slug: string;
  price: number;
  currency?: string;
  movement?: string;
  caseMaterial?: string;
  availability?: Availability;
  gender?: 'men' | 'women';
  isNewArrival?: boolean;
  collectionRef?: string;
  variants: WatchVariant[];
}

export interface Watch {
  _id: string;
  brand: BrandRef | string;
  name: string;
  slug: string;
  /** Shared by every colourway of one model; see `WatchSibling`. */
  modelGroup?: string;
  /**
   * The model's other colourways. Present on the grouped listing
   * (`group=model`) and on the single-product response; absent elsewhere,
   * which reads the same as "this model has only this one colourway".
   */
  siblings?: WatchSibling[];
  reference: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  type: WatchType;
  gender: 'men' | 'women';
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
  // Present only on the single-product detail response (GET /watches/:slug).
  accessories?: Watch[];
  related?: Watch[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  gender: 'men' | 'women';
  watches: Watch[] | string[];
  featured: boolean;
  isActive: boolean;
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
