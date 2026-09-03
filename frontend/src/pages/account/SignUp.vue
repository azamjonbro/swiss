<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';
import TurnstileWidget from '@/components/shared/TurnstileWidget.vue';

const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');
const captchaToken = ref('');
const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null);

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
const needsCaptcha = computed(() => Boolean(SITE_KEY) && !captchaToken.value);
const invalidField = ref<string>('');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function fail(field: string, message: string) {
  invalidField.value = field;
  errorMessage.value = message;
  return false;
}

function validate(): boolean {
  invalidField.value = '';
  errorMessage.value = '';

  if (!firstName.value.trim() || !lastName.value.trim() || !email.value.trim() || !phone.value.trim() || !password.value || !confirmPassword.value) {
    return fail('', locale.t('account.errorRequired'));
  }
  if (!EMAIL_RE.test(email.value.trim())) return fail('email', locale.t('account.errorEmailInvalid'));
  // Server-side normalisation is authoritative; this only catches obvious typos.
  if (phone.value.replace(/\D/g, '').length < 9) return fail('phone', locale.t('account.errorPhoneInvalid'));
  if (password.value.length < MIN_PASSWORD_LENGTH) return fail('password', locale.t('account.errorPasswordShort'));
  if (password.value !== confirmPassword.value) return fail('confirm', locale.t('account.errorPasswordMismatch'));

  return true;
}

async function submit() {
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    await account.register(
      {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value,
      },
      captchaToken.value,
    );
    // Registering signs them in, so there is no confirmation step to send them
    // to — take them straight to the account they just created.
    router.replace('/account');
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
    const code = response?.data?.code;
    // The spent token has to be replaced before another attempt can succeed.
    captcha.value?.reset();
    if (code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_FAILED') fail('', locale.t('account.captchaFailed'));
    else if (code === 'EMAIL_TAKEN') fail('email', locale.t('account.errorEmailTaken'));
    else if (code === 'PHONE_TAKEN') fail('phone', locale.t('account.errorPhoneTaken'));
    else if (code === 'PHONE_INVALID') fail('phone', locale.t('account.errorPhoneInvalid'));
    else if (code === 'EMAIL_INVALID') fail('email', locale.t('account.errorEmailInvalid'));
    else if (code === 'PASSWORD_SHORT') fail('password', locale.t('account.errorPasswordShort'));
    else fail('', locale.t('account.errorGeneric'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.registerEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.registerTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.registerLede') }}</p>

    <form novalidate @submit.prevent="submit">
      <div class="sw-auth-form__fields">
        <div class="sw-auth-form__row">
          <AuthField
            v-model="firstName"
            :label="locale.t('account.firstName')"
            autocomplete="given-name"
          />
          <AuthField
            v-model="lastName"
            :label="locale.t('account.lastName')"
            autocomplete="family-name"
          />
        </div>
        <AuthField
          v-model="email"
          :label="locale.t('account.emailLabel')"
          type="email"
          autocomplete="email"
          inputmode="email"
          :invalid="invalidField === 'email'"
        />
        <AuthField
          v-model="phone"
          :label="locale.t('account.phoneLabel')"
          type="tel"
          autocomplete="tel"
          inputmode="tel"
          :invalid="invalidField === 'phone'"
        />
        <AuthField
          v-model="password"
          :label="locale.t('account.passwordLabel')"
          type="password"
          autocomplete="new-password"
          :hint="locale.t('account.passwordHint')"
          :invalid="invalidField === 'password'"
        />
        <AuthField
          v-model="confirmPassword"
          :label="locale.t('account.confirmPasswordLabel')"
          type="password"
          autocomplete="new-password"
          :invalid="invalidField === 'confirm'"
        />
      </div>

      <TurnstileWidget ref="captcha" v-model="captchaToken" />

      <p v-if="errorMessage" class="sw-auth-form__error">{{ errorMessage }}</p>

      <div class="sw-auth-form__actions">
        <button class="sw-btn sw-btn--solid sw-auth-submit" type="submit" :disabled="isSubmitting || needsCaptcha">
          {{ isSubmitting ? locale.t('account.registeringButton') : locale.t('account.registerButton') }}
        </button>
      </div>
    </form>

    <p class="sw-auth-form__switch">
      <span>{{ locale.t('account.haveAccount') }}</span>
      <RouterLink class="sw-auth-form__switch-link" to="/account/login">
        {{ locale.t('account.signInLink') }}
      </RouterLink>
    </p>
  </div>

</template>
