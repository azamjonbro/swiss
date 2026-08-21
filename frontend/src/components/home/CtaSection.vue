<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';

const ui = useUiStore();
const locale = useLocaleStore();
</script>

<template>
  <section class="sw-cta">
    <span class="sw-eyebrow">{{ locale.t('cta.eyebrow') }}</span>
    <h2 class="sw-h1 sw-cta__title">{{ locale.t('cta.title') }}</h2>
    <div class="sw-cta__actions">
      <RouterLink class="sw-btn sw-btn--ghost" to="/watches">{{ locale.t('cta.explore') }}</RouterLink>
      <button class="sw-btn sw-btn--solid" type="button" @click="ui.openInquiry()">{{ locale.t('cta.request') }}</button>
    </div>
  </section>
</template>

<style scoped>
.sw-cta {
  padding: clamp(96px, 14vw, 200px) var(--container-pad);
  background: var(--sw-black);
  color: var(--sw-white);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.sw-cta__title {
  max-width: 780px;
}

.sw-cta__actions {
  margin-top: 16px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
