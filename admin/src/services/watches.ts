import { api } from './api';
import type { Paginated, Watch } from '@/types/models';

export interface WatchQuery {
  category?: string;
  brand?: string;
  collection?: string;
  featured?: boolean;
  isNew?: boolean;
  availability?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function fetchWatches(query: WatchQuery = {}): Promise<Paginated<Watch>> {
  const { data } = await api.get<Paginated<Watch>>('/watches', { params: query });
  return data;
}

export async function fetchWatchBySlug(slug: string): Promise<Watch> {
  const { data } = await api.get<Watch>(`/watches/${slug}`);
  return data;
}

// ---- Admin ----

export async function adminFetchWatches(query: { q?: string; page?: number; limit?: number } = {}) {
  const { data } = await api.get<Paginated<Watch>>('/admin/watches', { params: query });
  return data;
}

export async function adminFetchWatch(id: string): Promise<Watch> {
  const { data } = await api.get<Watch>(`/admin/watches/${id}`);
  return data;
}

export async function adminCreateWatch(payload: Partial<Watch>): Promise<Watch> {
  const { data } = await api.post<Watch>('/admin/watches', payload);
  return data;
}

export async function adminUpdateWatch(id: string, payload: Partial<Watch>): Promise<Watch> {
  const { data } = await api.put<Watch>(`/admin/watches/${id}`, payload);
  return data;
}

export async function adminDeleteWatch(id: string): Promise<void> {
  await api.delete(`/admin/watches/${id}`);
}
