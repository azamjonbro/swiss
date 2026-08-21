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

// ---- Admin ----

export async function adminFetchCategories(): Promise<Category[]> {
  const { data } = await api.get<{ items: Category[] }>('/admin/categories');
  return data.items;
}

export async function adminCreateCategory(payload: Partial<Category>): Promise<Category> {
  const { data } = await api.post<Category>('/admin/categories', payload);
  return data;
}

export async function adminUpdateCategory(id: string, payload: Partial<Category>): Promise<Category> {
  const { data } = await api.put<Category>(`/admin/categories/${id}`, payload);
  return data;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

export async function adminReorderCategories(order: string[]): Promise<Category[]> {
  const { data } = await api.put<{ items: Category[] }>('/admin/categories/reorder', { order });
  return data.items;
}
