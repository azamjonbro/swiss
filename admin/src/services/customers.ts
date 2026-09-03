import { api } from './api';
import type { CustomerDetail, CustomerList } from '@/types/customers';

export interface CustomerQuery {
  search?: string;
  page?: number;
}

export async function adminFetchCustomers(query: CustomerQuery = {}, signal?: AbortSignal): Promise<CustomerList> {
  const { data } = await api.get<CustomerList>('/admin/customers', {
    params: { search: query.search || undefined, page: query.page },
    signal,
  });
  return data;
}

export async function adminFetchCustomer(id: string): Promise<CustomerDetail> {
  const { data } = await api.get<CustomerDetail>(`/admin/customers/${id}`);
  return data;
}
