<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();

const identifier = ref('');
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

  if (!identifier.value.trim() || !password.value) {
    errorMessage.value = locale.t('account.errorRequired');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.login(identifier.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || '/account';
    // Only same-site paths are honoured, so a crafted ?redirect= can't bounce
    // a freshly signed-in customer off to another origin.
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account');
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
    resendMessage.value = await account.resendVerification(identifier.value.trim());
  } catch {
    resendMessage.value = locale.t('account.errorGeneric');
  } finally {
    isResending.value = false;
  }
}
</script>

<template>
  <div class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.signInEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.signInTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.signInLede') }}</p>

    <form novalidate @submit.prevent="submit">
      <div class="sw-auth-form__fields">
        <AuthField
          v-model="identifier"
          :label="locale.t('account.identifierLabel')"
          type="text"
          autocomplete="username"
          :invalid="Boolean(errorMessage)"
        />
        <AuthField
          v-model="password"
          :label="locale.t('account.passwordLabel')"
          type="password"
          autocomplete="current-password"
          :invalid="Boolean(errorMessage)"
        />
      </div>

      <div class="sw-auth-form__aside">
        <RouterLink class="sw-auth-link" to="/account/forgot-password">
          {{ locale.t('account.forgotPassword') }}
        </RouterLink>
      </div>

      <p v-if="errorMessage" class="sw-auth-form__error">{{ errorMessage }}</p>

      <p v-if="showResend" class="sw-auth-form__aside" style="justify-content: flex-start">
        <button class="sw-auth-link" type="button" :disabled="isResending" @click="resend">
          {{ locale.t('account.resendVerification') }}
        </button>
      </p>
      <p v-if="resendMessage" class="sw-auth-form__note">{{ resendMessage }}</p>

      <div class="sw-auth-form__actions">
        <button class="sw-btn sw-btn--solid sw-auth-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? locale.t('account.signingInButton') : locale.t('account.signInButton') }}
        </button>
      </div>
    </form>

    <p class="sw-auth-form__switch">
      <span>{{ locale.t('account.noAccount') }}</span>
      <RouterLink class="sw-auth-form__switch-link" to="/account/register">
        {{ locale.t('account.registerLink') }}
      </RouterLink>
    </p>
  </div>
</template>
