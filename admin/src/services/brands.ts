import { api } from './api';
import type { Brand } from '@/types/models';

export async function fetchBrands(featured?: boolean): Promise<Brand[]> {
  const { data } = await api.get<{ items: Brand[] }>('/brands', {
    params: featured !== undefined ? { featured } : undefined,
  });
  return data.items;
}

export async function fetchBrandBySlug(slug: string): Promise<Brand> {
  const { data } = await api.get<Brand>(`/brands/${slug}`);
  return data;
}

// ---- Admin ----

export async function adminFetchBrands(): Promise<Brand[]> {
  const { data } = await api.get<{ items: Brand[] }>('/admin/brands');
  return data.items;
}

export async function adminCreateBrand(payload: Partial<Brand>): Promise<Brand> {
  const { data } = await api.post<Brand>('/admin/brands', payload);
  return data;
}

export async function adminUpdateBrand(id: string, payload: Partial<Brand>): Promise<Brand> {
  const { data } = await api.put<Brand>(`/admin/brands/${id}`, payload);
  return data;
}

export async function adminDeleteBrand(id: string): Promise<void> {
  await api.delete(`/admin/brands/${id}`);
}
