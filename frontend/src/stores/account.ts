import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';

// Deliberately distinct from the admin panel's `sw_admin_token`: the two apps
// keep entirely separate sessions, and neither key is ever read by the other.
const STORAGE_KEY = 'sw-customer-token';

export interface CustomerUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface ProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const useAccountStore = defineStore('account', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const user = ref<CustomerUser | null>(null);
  const isReady = ref(false);
  // Held so the app-startup restore and a concurrent route guard share one
  // request instead of racing two /account/me calls.
  let restoreInFlight: Promise<void> | null = null;

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const initials = computed(() => {
    if (!user.value) return '';
    return `${user.value.firstName?.[0] ?? ''}${user.value.lastName?.[0] ?? ''}`.toUpperCase();
  });

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

  /**
   * Registering signs the customer straight in.
   *
   * There is no email confirmation step any more, so there is nothing to wait
   * for between creating the account and using it.
   */
  async function register(payload: RegisterPayload, captchaToken: string): Promise<CustomerUser> {
    const { data } = await api.post('/account/register', { ...payload, captchaToken });
    setSession(data.token, data.user);
    return data.user;
  }

  /** `identifier` accepts either an email address or a phone number. */
  async function login(identifier: string, password: string, captchaToken: string): Promise<CustomerUser> {
    const { data } = await api.post('/account/login', { identifier, password, captchaToken });
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

  /**
   * Resolves the stored token into a user. Called once at startup so the header,
   * the wishlist and the save controls know the customer is signed in on every
   * page — not only on the guarded /account routes — and awaited by the router
   * guard on a deep link, where it may not have finished yet.
   */
  async function restoreSession(): Promise<void> {
    if (isReady.value) return;
    if (restoreInFlight) return restoreInFlight;

    restoreInFlight = (async () => {
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
    })().finally(() => {
      restoreInFlight = null;
    });

    return restoreInFlight;
  }

  async function updateProfile(payload: ProfilePayload): Promise<string> {
    const { data } = await api.patch('/account/profile', payload);
    user.value = data.user;
    return data.message as string;
  }

  async function changePassword(currentPassword: string, newPassword: string, captchaToken: string): Promise<string> {
    const { data } = await api.post('/account/change-password', { currentPassword, newPassword, captchaToken });
    return data.message as string;
  }

  return {
    token,
    user,
    isReady,
    isAuthenticated,
    initials,
    setSession,
    clearSession,
    register,
    login,
    logout,
    restoreSession,
    updateProfile,
    changePassword,
  };
});
