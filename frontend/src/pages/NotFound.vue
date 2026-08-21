<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();
</script>

<template>
  <div class="sw-404">
    <span class="sw-eyebrow">{{ locale.t('notFound.eyebrow') }}</span>
    <h1 class="sw-display">{{ locale.t('notFound.title') }}</h1>
    <p class="sw-body-lg">{{ locale.t('notFound.body') }}</p>
    <RouterLink class="sw-btn sw-btn--solid" to="/">{{ locale.t('notFound.returnHome') }}</RouterLink>
  </div>
</template>

<style scoped>
.sw-404 {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 20px;
  padding: 0 var(--container-pad);
}

.sw-404 .sw-btn--solid {
  margin-top: 16px;
}
</style>
