import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  const locale = useLocaleStore();
  config.params = { ...config.params, lang: locale.lang };

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.clearSession();
    }
    return Promise.reject(error);
  },
);
