<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';
import TurnstileWidget from '@/components/shared/TurnstileWidget.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

const identifier = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const captchaToken = ref('');
const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null);

/** Empty only while a captcha is configured and not yet solved. */
const needsCaptcha = computed(() => Boolean(SITE_KEY) && !captchaToken.value);

async function submit() {
  errorMessage.value = '';

  if (!identifier.value.trim() || !password.value) {
    errorMessage.value = locale.t('account.errorRequired');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.login(identifier.value.trim(), password.value, captchaToken.value);
    const redirect = (route.query.redirect as string) || '/account';
    // Only same-site paths are honoured, so a crafted ?redirect= can't bounce
    // a freshly signed-in customer off to another origin.
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account');
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
    const code = response?.data?.code;
    // A Turnstile token is spent by the attempt that failed; the widget has to
    // issue a new one or the next try fails for a reason nobody can see.
    captcha.value?.reset();
    if (code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_FAILED') {
      errorMessage.value = locale.t('account.captchaFailed');
    } else if (response?.status === 401) {
      errorMessage.value = locale.t('account.invalidCredentials');
    } else {
      errorMessage.value = locale.t('account.errorGeneric');
    }
  } finally {
    isSubmitting.value = false;
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

      <TurnstileWidget ref="captcha" v-model="captchaToken" />

      <p v-if="errorMessage" class="sw-auth-form__error">{{ errorMessage }}</p>

      <div class="sw-auth-form__actions">
        <button class="sw-btn sw-btn--solid sw-auth-submit" type="submit" :disabled="isSubmitting || needsCaptcha">
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
