import { api } from './api';
import type { Inquiry, InquiryStatus, Paginated } from '@/types/models';

export interface InquiryPayload {
  name: string;
  phone: string;
  email: string;
  watch?: string;
  message?: string;
}

export async function createInquiry(payload: InquiryPayload): Promise<{ message: string; inquiry: Inquiry }> {
  const { data } = await api.post('/inquiries', payload);
  return data;
}

// ---- Admin ----

export async function adminFetchInquiries(query: { status?: InquiryStatus; page?: number } = {}) {
  const { data } = await api.get<Paginated<Inquiry>>('/admin/inquiries', { params: query });
  return data;
}

export async function adminUpdateInquiry(id: string, status: InquiryStatus): Promise<Inquiry> {
  const { data } = await api.put<Inquiry>(`/admin/inquiries/${id}`, { status });
  return data;
}

export async function adminDeleteInquiry(id: string): Promise<void> {
  await api.delete(`/admin/inquiries/${id}`);
}
