import { api } from './api';
import type { Inquiry } from '@/types/models';

/**
 * A customer's acquisition history. The boutique records purchases as concierge
 * requests, so each entry is the inquiry raised for a given timepiece.
 */
export async function fetchOrders(): Promise<Inquiry[]> {
  const { data } = await api.get('/account/orders');
  return data.items ?? [];
}
