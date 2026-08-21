import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';

const STORAGE_KEY = 'sw-customer-token';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

export const useAccountStore = defineStore('account', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const user = ref<CustomerUser | null>(null);
  const isReady = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));

  function setSession(newToken: string, newUser: CustomerUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem(STORAGE_KEY, newToken);
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  async function register(name: string, email: string, password: string): Promise<string> {
    const { data } = await api.post('/account/register', { name, email, password });
    return data.message as string;
  }

  async function login(email: string, password: string): Promise<CustomerUser> {
    const { data } = await api.post('/account/login', { email, password });
    setSession(data.token, data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post('/account/logout');
    } finally {
      clearSession();
    }
  }

  async function restoreSession() {
    if (!token.value) {
      isReady.value = true;
      return;
    }
    try {
      const { data } = await api.get('/account/me');
      user.value = data.user;
    } catch {
      clearSession();
    } finally {
      isReady.value = true;
    }
  }

  async function resendVerification(email: string): Promise<string> {
    const { data } = await api.post('/account/resend-verification', { email });
    return data.message as string;
  }

  async function verifyEmail(verifyToken: string): Promise<string> {
    const { data } = await api.get('/account/verify-email', { params: { token: verifyToken } });
    return data.message as string;
  }

  return {
    token,
    user,
    isReady,
    isAuthenticated,
    setSession,
    clearSession,
    register,
    login,
    logout,
    restoreSession,
    resendVerification,
    verifyEmail,
  };
});
