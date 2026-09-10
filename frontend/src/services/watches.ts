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
  /**
   * 'model' collapses a model's colourways into one row, carrying the rest as
   * `siblings`. The catalogue publishes one product per dial colour, so without
   * this the grid draws twenty-one identical "PRX 40mm" cards — and the
   * ungrouped catalogue is past 900 rows, which no longer fits the single
   * fetch the listing page makes.
   */
  group?: 'model';
}

export async function fetchWatches(query: WatchQuery = {}): Promise<Paginated<Watch>> {
  const { data } = await api.get<Paginated<Watch>>('/watches', { params: query });
  return data;
}

/**
 * The saved list, fetched by id. Rows come back in the order asked for, and a
 * product that has since been withdrawn is simply missing from the response —
 * see `listWatchesByIds` on the server.
 */
export async function fetchWatchesByIds(ids: string[]): Promise<Watch[]> {
  if (!ids.length) return [];
  const { data } = await api.get<Paginated<Watch>>('/watches', { params: { ids: ids.join(',') } });
  return data.items ?? [];
}

export async function fetchWatchBySlug(slug: string): Promise<Watch> {
  const { data } = await api.get<Watch>(`/watches/${slug}`);
  return data;
}
