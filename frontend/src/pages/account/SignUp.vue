<script setup lang="ts">
import { ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';

const locale = useLocaleStore();
const account = useAccountStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');

const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref('');
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
    await account.register({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      password: password.value,
    });
    isSubmitted.value = true;
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
    const code = response?.data?.code;
    if (code === 'EMAIL_TAKEN') fail('email', locale.t('account.errorEmailTaken'));
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
  <div v-if="!isSubmitted" class="sw-auth-form">
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

      <p v-if="errorMessage" class="sw-auth-form__error">{{ errorMessage }}</p>

      <div class="sw-auth-form__actions">
        <button class="sw-btn sw-btn--solid sw-auth-submit" type="submit" :disabled="isSubmitting">
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

  <div v-else class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.registerSuccessEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.registerSuccessTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.registerSuccessBody') }}</p>
    <p class="sw-auth-form__note">{{ email }}</p>

    <div class="sw-auth-form__actions">
      <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/login">
        {{ locale.t('account.goToLogin') }}
      </RouterLink>
    </div>
  </div>
</template>
