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

export interface Watch {
  _id: string;
  brand: BrandRef | string;
  name: string;
  slug: string;
  reference: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  images: string[];
  videos: string[];
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
  createdAt?: string;
  updatedAt?: string;
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
