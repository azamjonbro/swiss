<script setup lang="ts">
import { ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import AuthField from '@/components/account/AuthField.vue';

const locale = useLocaleStore();
const account = useAccountStore();

const email = ref('');
const isSubmitting = ref(false);
const isSent = ref(false);
const errorMessage = ref('');

async function submit() {
  errorMessage.value = '';
  if (!email.value.trim()) {
    errorMessage.value = locale.t('account.errorRequired');
    return;
  }

  isSubmitting.value = true;
  try {
    await account.forgotPassword(email.value.trim());
    isSent.value = true;
  } catch {
    errorMessage.value = locale.t('account.errorGeneric');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="!isSent" class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.forgotEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.forgotTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.forgotLede') }}</p>

    <form novalidate @submit.prevent="submit">
      <div class="sw-auth-form__fields">
        <AuthField
          v-model="email"
          :label="locale.t('account.emailLabel')"
          type="email"
          autocomplete="email"
          inputmode="email"
          :invalid="Boolean(errorMessage)"
        />
      </div>

      <p v-if="errorMessage" class="sw-auth-form__error">{{ errorMessage }}</p>

      <div class="sw-auth-form__actions">
        <button class="sw-btn sw-btn--solid sw-auth-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? locale.t('account.sendingButton') : locale.t('account.sendResetLink') }}
        </button>
      </div>
    </form>

    <p class="sw-auth-form__switch">
      <span>{{ locale.t('account.rememberedPassword') }}</span>
      <RouterLink class="sw-auth-form__switch-link" to="/account/login">
        {{ locale.t('account.signInLink') }}
      </RouterLink>
    </p>
  </div>

  <div v-else class="sw-auth-form">
    <span class="sw-eyebrow">{{ locale.t('account.forgotSentEyebrow') }}</span>
    <h1 class="sw-auth-form__title">{{ locale.t('account.forgotSentTitle') }}</h1>
    <p class="sw-body sw-auth-form__lede">{{ locale.t('account.forgotSentBody') }}</p>
    <p class="sw-auth-form__note">{{ email }}</p>

    <div class="sw-auth-form__actions">
      <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/login">
        {{ locale.t('account.goToLogin') }}
      </RouterLink>
    </div>
  </div>
</template>
