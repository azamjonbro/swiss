<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';

const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref('');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function submit() {
  errorMessage.value = '';

  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = locale.t('account.errorRequired');
    return;
  }
  if (!EMAIL_RE.test(email.value)) {
    errorMessage.value = locale.t('account.errorEmailInvalid');
    return;
  }
  if (password.value.length < 8) {
    errorMessage.value = locale.t('account.errorPasswordShort');
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = locale.t('account.errorPasswordMismatch');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.register(name.value, email.value, password.value);
    isSubmitted.value = true;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    errorMessage.value = status === 409 ? locale.t('account.errorEmailTaken') : locale.t('account.errorGeneric');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="sw-account-page">
    <div class="sw-account-card">
      <template v-if="!isSubmitted">
        <span class="sw-eyebrow">{{ locale.t('account.registerEyebrow') }}</span>
        <h1 class="sw-h2">{{ locale.t('account.registerTitle') }}</h1>
        <p class="sw-body">{{ locale.t('account.registerSubtitle') }}</p>

        <form class="sw-account-form" @submit.prevent="submit">
          <label class="sw-account-field">
            <span class="sw-label">{{ locale.t('account.fullName') }}</span>
            <input v-model="name" type="text" autocomplete="name" required />
          </label>
          <label class="sw-account-field">
            <span class="sw-label">{{ locale.t('account.emailLabel') }}</span>
            <input v-model="email" type="email" autocomplete="email" required />
          </label>
          <label class="sw-account-field">
            <span class="sw-label">{{ locale.t('account.passwordLabel') }}</span>
            <input v-model="password" type="password" autocomplete="new-password" required />
          </label>
          <label class="sw-account-field">
            <span class="sw-label">{{ locale.t('account.confirmPasswordLabel') }}</span>
            <input v-model="confirmPassword" type="password" autocomplete="new-password" required />
          </label>

          <p v-if="errorMessage" class="sw-account-error">{{ errorMessage }}</p>

          <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? locale.t('account.registeringButton') : locale.t('account.registerButton') }}
          </button>
        </form>

        <p class="sw-account-switch">
          {{ locale.t('account.haveAccount') }}
          <RouterLink to="/account/login">{{ locale.t('account.signInLink') }}</RouterLink>
        </p>
      </template>

      <template v-else>
        <span class="sw-eyebrow">{{ locale.t('account.registerSuccessEyebrow') }}</span>
        <h1 class="sw-h2">{{ locale.t('account.registerSuccessTitle') }}</h1>
        <p class="sw-body">{{ locale.t('account.registerSuccessBody') }}</p>
        <button class="sw-btn sw-btn--solid" type="button" @click="router.push('/account/login')">
          {{ locale.t('account.goToLogin') }}
        </button>
      </template>
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

.sw-account-form button {
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
