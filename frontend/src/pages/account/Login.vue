<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const showResend = ref(false);
const resendMessage = ref('');
const isResending = ref(false);

async function submit() {
  errorMessage.value = '';
  resendMessage.value = '';
  showResend.value = false;

  if (!email.value || !password.value) {
    errorMessage.value = locale.t('account.errorRequired');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/account';
    router.push(redirect);
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
    if (response?.data?.code === 'EMAIL_NOT_VERIFIED') {
      errorMessage.value = locale.t('account.emailNotVerified');
      showResend.value = true;
    } else if (response?.status === 401) {
      errorMessage.value = locale.t('account.invalidCredentials');
    } else {
      errorMessage.value = locale.t('account.errorGeneric');
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function resend() {
  isResending.value = true;
  try {
    resendMessage.value = await account.resendVerification(email.value);
  } catch {
    resendMessage.value = locale.t('account.errorGeneric');
  } finally {
    isResending.value = false;
  }
}
</script>

<template>
  <div class="sw-account-page">
    <div class="sw-account-card">
      <span class="sw-eyebrow">{{ locale.t('account.loginEyebrow') }}</span>
      <h1 class="sw-h2">{{ locale.t('account.loginTitle') }}</h1>
      <p class="sw-body">{{ locale.t('account.loginSubtitle') }}</p>

      <form class="sw-account-form" @submit.prevent="submit">
        <label class="sw-account-field">
          <span class="sw-label">{{ locale.t('account.emailLabel') }}</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label class="sw-account-field">
          <span class="sw-label">{{ locale.t('account.passwordLabel') }}</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="errorMessage" class="sw-account-error">{{ errorMessage }}</p>
        <button v-if="showResend" class="sw-account-resend" type="button" :disabled="isResending" @click="resend">
          {{ locale.t('account.resendVerification') }}
        </button>
        <p v-if="resendMessage" class="sw-account-hint">{{ resendMessage }}</p>

        <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? locale.t('account.signingInButton') : locale.t('account.loginButton') }}
        </button>
      </form>

      <p class="sw-account-switch">
        {{ locale.t('account.noAccount') }}
        <RouterLink to="/account/register">{{ locale.t('account.registerLink') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.sw-account-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--header-height) + 48px) var(--container-pad) 80px;
}

.sw-account-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-account-card h1 {
  margin-top: 4px;
}

.sw-account-card > .sw-body {
  margin-bottom: 24px;
}

.sw-account-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sw-account-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-account-field input {
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 10px 0;
  font-size: 1rem;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.sw-account-field input:focus {
  border-color: var(--accent);
}

.sw-account-error {
  color: var(--sw-burgundy);
  font-size: 0.85rem;
}

.sw-account-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.sw-account-resend {
  align-self: flex-start;
  font-size: 0.8rem;
  text-decoration: underline;
  color: var(--text);
}

.sw-account-form button[type='submit'] {
  margin-top: 8px;
  align-self: flex-start;
}

.sw-account-switch {
  margin-top: 28px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.sw-account-switch a {
  color: var(--text);
  text-decoration: underline;
  margin-left: 4px;
}
</style>
