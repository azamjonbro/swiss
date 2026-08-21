<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import AdminPreferencesBar from '@/components/admin/AdminPreferencesBar.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const locale = useLocaleStore();

const email = ref('');
const password = ref('');
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
  <div class="sw-admin sw-admin-login">
    <form class="sw-admin-login__form sw-admin-card" @submit.prevent="submit">
      <span class="sw-admin-login__brand">SwissWatch<span>Admin</span></span>
      <p class="sw-admin-login__sub">{{ locale.t('admin.signInSub') }}</p>

      <label>
        <span>{{ locale.t('admin.email') }}</span>
        <input v-model="email" type="email" required autocomplete="username" />
      </label>
      <label>
        <span>{{ locale.t('admin.password') }}</span>
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <p v-if="errorMessage" class="sw-admin-login__error">{{ errorMessage }}</p>

      <button class="sw-admin-btn" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? locale.t('admin.signingIn') : locale.t('admin.signIn') }}
      </button>
    </form>
    <div class="sw-admin-login__prefs">
      <AdminPreferencesBar />
    </div>
  </div>
</template>

<style scoped>
.sw-admin-login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
}

.sw-admin-login__form {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sw-admin-login__brand {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.35rem;
  letter-spacing: -0.01em;
}

.sw-admin-login__brand span {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-admin-login__sub {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
  margin-bottom: 6px;
}

.sw-admin-login__error {
  font-size: 0.8rem;
  color: #a3313f;
}
</style>
