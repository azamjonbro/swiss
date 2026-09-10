import { api } from './api';
import type { Branch } from '@/types/models';

export async function adminFetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ items: Branch[] }>('/admin/branches');
  return data.items;
}

export async function adminCreateBranch(payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.post<Branch>('/admin/branches', payload);
  return data;
}

export async function adminUpdateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.put<Branch>(`/admin/branches/${id}`, payload);
  return data;
}

export async function adminDeleteBranch(id: string): Promise<void> {
  await api.delete(`/admin/branches/${id}`);
}
