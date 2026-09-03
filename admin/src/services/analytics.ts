import { api } from './api';
import type { AnalyticsLive, AnalyticsSummary } from '@/types/analytics';

export interface RangeQuery {
  /** YYYY-MM-DD, inclusive. */
  from: string;
  /** YYYY-MM-DD, inclusive. */
  to: string;
}

export async function fetchAnalyticsSummary(range: RangeQuery, signal?: AbortSignal): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>('/admin/analytics/summary', { params: range, signal });
  return data;
}

export async function fetchAnalyticsLive(signal?: AbortSignal): Promise<AnalyticsLive> {
  const { data } = await api.get<AnalyticsLive>('/admin/analytics/live', { signal });
  return data;
}
