import { api } from './api';
import type { Faq } from '@/types/models';

export async function adminFetchFaqs(): Promise<Faq[]> {
  const { data } = await api.get<{ items: Faq[] }>('/admin/faqs');
  return data.items;
}

export async function adminCreateFaq(payload: Partial<Faq>): Promise<Faq> {
  const { data } = await api.post<Faq>('/admin/faqs', payload);
  return data;
}

export async function adminUpdateFaq(id: string, payload: Partial<Faq>): Promise<Faq> {
  const { data } = await api.put<Faq>(`/admin/faqs/${id}`, payload);
  return data;
}

export async function adminDeleteFaq(id: string): Promise<void> {
  await api.delete(`/admin/faqs/${id}`);
}
