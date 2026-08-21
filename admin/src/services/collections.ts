import { api } from './api';
import type { Collection } from '@/types/models';

export async function fetchCollections(): Promise<Collection[]> {
  const { data } = await api.get<{ items: Collection[] }>('/collections');
  return data.items;
}

export async function fetchCollectionBySlug(slug: string): Promise<Collection> {
  const { data } = await api.get<Collection>(`/collections/${slug}`);
  return data;
}

// ---- Admin ----

export async function adminFetchCollections(): Promise<Collection[]> {
  const { data } = await api.get<{ items: Collection[] }>('/admin/collections');
  return data.items;
}

export async function adminCreateCollection(payload: Partial<Collection>): Promise<Collection> {
  const { data } = await api.post<Collection>('/admin/collections', payload);
  return data;
}

export async function adminUpdateCollection(id: string, payload: Partial<Collection>): Promise<Collection> {
  const { data } = await api.put<Collection>(`/admin/collections/${id}`, payload);
  return data;
}

export async function adminDeleteCollection(id: string): Promise<void> {
  await api.delete(`/admin/collections/${id}`);
}
