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
  <div class="sw-account-page">
    <div class="sw-account-card">
      <template v-if="state === 'loading'">
        <p class="sw-body">{{ locale.t('account.verifyingTitle') }}</p>
      </template>

      <template v-else-if="state === 'success'">
        <span class="sw-eyebrow">{{ locale.t('account.verifySuccessEyebrow') }}</span>
        <h1 class="sw-h2">{{ locale.t('account.verifySuccessTitle') }}</h1>
        <p class="sw-body">{{ locale.t('account.verifySuccessBody') }}</p>
        <RouterLink class="sw-btn sw-btn--solid" to="/account/login">{{ locale.t('account.goToLogin') }}</RouterLink>
      </template>

      <template v-else>
        <span class="sw-eyebrow">{{ locale.t('account.verifyErrorEyebrow') }}</span>
        <h1 class="sw-h2">{{ locale.t('account.verifyErrorTitle') }}</h1>
        <p class="sw-body">{{ locale.t('account.verifyErrorBody') }}</p>
        <RouterLink class="sw-btn sw-btn--solid" to="/account/login">{{ locale.t('account.goToLogin') }}</RouterLink>
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
  text-align: center;
}

.sw-account-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.sw-account-card .sw-btn {
  margin-top: 20px;
}
</style>
