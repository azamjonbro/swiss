import axios from 'axios';
import { useLocaleStore } from '@/stores/locale';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
});

api.interceptors.request.use((config) => {
  const locale = useLocaleStore();
  config.params = { ...config.params, lang: locale.lang };

  return config;
});
