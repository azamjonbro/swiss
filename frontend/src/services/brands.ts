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
