import { api } from './api';
import type { CustomerDetail, CustomerList } from '@/types/customers';

export interface CustomerQuery {
  search?: string;
  /** Omit for all; true/false narrows to confirmed or pending addresses. */
  verified?: boolean;
  page?: number;
}

export async function adminFetchCustomers(query: CustomerQuery = {}, signal?: AbortSignal): Promise<CustomerList> {
  const { data } = await api.get<CustomerList>('/admin/customers', {
    params: {
      search: query.search || undefined,
      verified: query.verified === undefined ? undefined : String(query.verified),
      page: query.page,
    },
    signal,
  });
  return data;
}

export async function adminFetchCustomer(id: string): Promise<CustomerDetail> {
  const { data } = await api.get<CustomerDetail>(`/admin/customers/${id}`);
  return data;
}
