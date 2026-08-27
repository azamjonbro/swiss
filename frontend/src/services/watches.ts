import { api } from './api';
import type { Paginated, Watch } from '@/types/models';

export interface WatchQuery {
  category?: string;
  brand?: string;
  collection?: string;
  featured?: boolean;
  isNew?: boolean;
  availability?: string;
  color?: string;
  // 'all' returns watches and accessories in one listing.
  type?: 'watch' | 'accessory' | 'all';
  gender?: 'men' | 'women';
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
