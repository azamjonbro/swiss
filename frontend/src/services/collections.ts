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
