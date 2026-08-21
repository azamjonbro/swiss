import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Admin } from '@/types/models';
import * as authService from '@/services/auth';

const TOKEN_KEY = 'sw_admin_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const admin = ref<Admin | null>(null);
  const isReady = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && admin.value));

  function setSession(newToken: string, newAdmin: Admin) {
    token.value = newToken;
    admin.value = newAdmin;
    localStorage.setItem(TOKEN_KEY, newToken);
  }

  function clearSession() {
    token.value = null;
    admin.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async function login(email: string, password: string) {
    const result = await authService.login(email, password);
    setSession(result.token, result.admin);
    return result.admin;
  }

  async function logout() {
    try {
      await authService.logout();
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
      admin.value = await authService.fetchMe();
    } catch {
      clearSession();
    } finally {
      isReady.value = true;
    }
  }

  return { token, admin, isReady, isAuthenticated, setSession, clearSession, login, logout, restoreSession };
});
