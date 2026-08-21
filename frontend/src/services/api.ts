import axios from 'axios';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
});

api.interceptors.request.use((config) => {
  const locale = useLocaleStore();
  config.params = { ...config.params, lang: locale.lang };

  const account = useAccountStore();
  if (account.token) {
    config.headers.Authorization = `Bearer ${account.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAccountStore().clearSession();
    }
    return Promise.reject(error);
  },
);
