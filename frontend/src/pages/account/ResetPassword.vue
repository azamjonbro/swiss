<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';

const route = useRoute();
const locale = useLocaleStore();
const account = useAccountStore();

const resetToken = computed(() => (route.query.token as string | undefined) ?? '');

const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const isDone = ref(false);
const errorMessage = ref('');
const invalidField = ref('');

const MIN_PASSWORD_LENGTH = 8;

async function submit() {
  errorMessage.value = '';
  invalidField.value = '';

  if (password.value.length < MIN_PASSWORD_LENGTH) {
    invalidField.value = 'password';
    errorMessage.value = locale.t('account.errorPasswordShort');
    return;
  }
  if (password.value !== confirmPassword.value) {
    invalidField.value = 'confirm';
    errorMessage.value = locale.t('account.errorPasswordMismatch');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.resetPassword(resetToken.value, password.value);
    // A completed reset invalidates whatever session was open in this tab.
    account.clearSession();
    isDone.value = true;
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    errorMessage.value =
      code === 'RESET_TOKEN_INVALID' ? locale.t('account.resetTokenInvalid') : locale.t('account.errorGeneric');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="!resetToken" class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.verifyErrorEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.resetTokenInvalid') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.resetTokenInvalidBody') }}</p>

    <div class="sw-auth-form__actions">
      <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/forgot-password">
        {{ locale.t('account.sendResetLink') }}
      </RouterLink>
    </div>
  </div>

  <div v-else-if="!isDone" class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.resetEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.resetTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.resetLede') }}</p>

    <form novalidate @submit.prevent="submit">
      <div class="sw-auth-form__fields">
        <AuthField
          v-model="password"
          :label="locale.t('account.newPasswordLabel')"
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
          {{ isSubmitting ? locale.t('account.savingButton') : locale.t('account.resetButton') }}
        </button>
      </div>
    </form>
  </div>

  <div v-else class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.resetDoneEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.resetDoneTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.resetDoneBody') }}</p>

    <div class="sw-auth-form__actions">
      <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/login">
        {{ locale.t('account.goToLogin') }}
      </RouterLink>
    </div>
  </div>
</template>
