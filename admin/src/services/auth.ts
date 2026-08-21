import { api } from './api';
import type { Admin } from '@/types/models';

export async function login(email: string, password: string): Promise<{ token: string; admin: Admin }> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function fetchMe(): Promise<Admin> {
  const { data } = await api.get<{ admin: Admin }>('/auth/me');
  return data.admin;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
