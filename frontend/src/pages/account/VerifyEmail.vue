<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';

const route = useRoute();
const locale = useLocaleStore();
const account = useAccountStore();

type State = 'loading' | 'success' | 'error';
const state = ref<State>('loading');

onMounted(async () => {
  const token = route.query.token as string | undefined;
  if (!token) {
    state.value = 'error';
    return;
  }
  try {
    await account.verifyEmail(token);
    state.value = 'success';
  } catch {
    state.value = 'error';
  }
});
</script>

<template>
  <div class="sw-auth-form">
    <template v-if="state === 'loading'">
      <span class="sw-eyebrow">{{ locale.t('account.brandEyebrow') }}</span>
      <h1 class="sw-auth-form__title">{{ locale.t('account.verifyingTitle') }}</h1>
    </template>

    <template v-else-if="state === 'success'">
      <span class="sw-eyebrow">{{ locale.t('account.verifySuccessEyebrow') }}</span>
      <h1 class="sw-auth-form__title">{{ locale.t('account.verifySuccessTitle') }}</h1>
      <p class="sw-body sw-auth-form__lede">{{ locale.t('account.verifySuccessBody') }}</p>
      <div class="sw-auth-form__actions">
        <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/login">
          {{ locale.t('account.goToLogin') }}
        </RouterLink>
      </div>
    </template>

    <template v-else>
      <span class="sw-eyebrow">{{ locale.t('account.verifyErrorEyebrow') }}</span>
      <h1 class="sw-auth-form__title">{{ locale.t('account.verifyErrorTitle') }}</h1>
      <p class="sw-body sw-auth-form__lede">{{ locale.t('account.verifyErrorBody') }}</p>
      <div class="sw-auth-form__actions">
        <RouterLink class="sw-btn sw-btn--solid sw-auth-submit" to="/account/login">
          {{ locale.t('account.goToLogin') }}
        </RouterLink>
      </div>
    </template>
  </div>
</template>
