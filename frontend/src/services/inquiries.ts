import { api } from './api';
import type { Inquiry } from '@/types/models';

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
