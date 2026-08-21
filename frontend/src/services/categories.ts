import { api } from './api';
import type { Category } from '@/types/models';

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<{ items: Category[] }>('/categories');
  return data.items;
}

export async function fetchCategoryBySlug(slug: string): Promise<Category> {
  const { data } = await api.get<Category>(`/categories/${slug}`);
  return data;
}
