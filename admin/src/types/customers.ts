/** Shapes returned by `/api/admin/customers`. Read-only: the panel reports. */

export interface CustomerRow {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  /** Size of their wishlist, never its contents. */
  savedCount: number;
  inquiryCount: number;
  /** null until they have signed in at least once. */
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CustomerList {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface CustomerSavedWatch {
  _id: string;
  name: string;
  slug: string;
  reference?: string;
  price?: number;
  currency?: string;
}

export interface CustomerInquiry {
  _id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  watch?: { _id: string; name: string; slug: string } | null;
  createdAt: string;
}

export interface CustomerDetail {
  customer: Omit<CustomerRow, 'savedCount' | 'inquiryCount'>;
  savedWatches: CustomerSavedWatch[];
  inquiries: CustomerInquiry[];
}
