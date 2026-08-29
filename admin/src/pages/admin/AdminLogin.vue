<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import AdminPreferencesBar from '@/components/admin/AdminPreferencesBar.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const locale = useLocaleStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isSubmitting = ref(false);

async function submit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch {
    errorMessage.value = locale.t('admin.invalidCredentials');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="sw-admin sw-login">
    <div class="sw-login__prefs">
      <AdminPreferencesBar />
    </div>

    <form class="sw-login__card" @submit.prevent="submit">
      <span class="sw-login__brand">
        <svg class="sw-login__mark" viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="9" fill="#ad2b39" />
          <rect x="23" y="6" width="3" height="28" rx="0.6" fill="#7c1f29" />
          <rect x="7.5" y="22" width="26" height="3" rx="0.6" fill="#7c1f29" />
          <rect x="16" y="5" width="7" height="30" rx="1" fill="#f3efe7" />
          <rect x="5.5" y="15" width="28" height="7" rx="1" fill="#f3efe7" />
        </svg>
        <span class="sw-login__brand-text">
          SwissWatch
          <span>{{ locale.t('admin.consoleLabel') }}</span>
        </span>
      </span>

      <p class="sw-login__sub">{{ locale.t('admin.signInSub') }}</p>

      <label>
        <span>{{ locale.t('admin.email') }}</span>
        <input v-model="email" type="email" required autocomplete="username" />
      </label>

      <label>
        <span>{{ locale.t('admin.password') }}</span>
        <span class="sw-login__password">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
          />
          <button
            class="sw-login__reveal"
            type="button"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <AdminIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="16" />
          </button>
        </span>
      </label>

      <p v-if="errorMessage" class="sw-login__error">
        <AdminIcon name="alert" :size="14" />
        {{ errorMessage }}
      </p>

      <button class="sw-admin-btn sw-admin-btn--block" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? locale.t('admin.signingIn') : locale.t('admin.signIn') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.sw-login {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(1100px 520px at 50% -10%, var(--admin-accent-soft), transparent 70%),
    var(--admin-bg);
}

.sw-login__prefs {
  position: absolute;
  top: 22px;
  right: 24px;
}

.sw-login__card {
  width: 100%;
  max-width: 384px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 30px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.sw-login__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 650;
  font-size: 1.2rem;
  letter-spacing: -0.015em;
}

.sw-login__mark {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 9px;
}

.sw-login__brand-text {
  line-height: 1.15;
}

.sw-login__brand-text span {
  display: block;
  margin-top: 2px;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--admin-text-subtle);
}

.sw-login__sub {
  margin-bottom: 4px;
  font-size: 0.85rem;
  color: var(--admin-text-muted);
}

.sw-login__password {
  position: relative;
  display: block;
}

.sw-login__password input {
  padding-right: 40px;
}

.sw-login__reveal {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  color: var(--admin-text-subtle);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-login__reveal:hover {
  color: var(--admin-text);
}

.sw-login__error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-radius: var(--radius-md);
  background: var(--admin-danger-soft);
  color: var(--admin-danger);
  font-size: 0.8rem;
}

.sw-login__error svg {
  flex: none;
}
</style>
