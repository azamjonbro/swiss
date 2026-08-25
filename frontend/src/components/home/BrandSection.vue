<script setup lang="ts">
import type { Brand } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import BrandMaisonCard from '@/components/home/BrandMaisonCard.vue';

interface Props {
  brands: Brand[];
}

defineProps<Props>();
const locale = useLocaleStore();
</script>

<template>
  <section class="sw-brands">
    <div class="sw-brands__inner">
      <div class="sw-brands__header">
        <span v-reveal class="sw-eyebrow">{{ locale.t('brandsSection.eyebrow') }}</span>
        <h2 v-reveal="0.08" class="sw-h2">{{ locale.t('brandsSection.title') }}</h2>
      </div>

      <ul class="sw-brands__list">
        <BrandMaisonCard v-for="brand in brands" :key="brand._id" :brand="brand" />
      </ul>
    </div>
  </section>
</template>

<style scoped>
.sw-brands {
  padding-block: var(--space-section-sm);
  background: var(--sw-ivory);
  color: var(--sw-black);
}

:root[data-theme='dark'] .sw-brands {
  background: #131211;
  color: var(--sw-ivory);
}

.sw-brands__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

.sw-brands__header {
  display: grid;
  gap: 24px;
  margin-bottom: clamp(48px, 6vw, 88px);
}

.sw-brands__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: clamp(16px, 2vw, 28px);
}

/* Hovering one plaque dims its neighbours a few percent — just enough to pull
   attention to the maison being explored, never enough to read as a filter. */
@media (hover: hover) {
  .sw-brands__list:hover > :not(:hover) {
    opacity: 0.95;
    transition: opacity 0.5s var(--ease-editorial);
  }

  .sw-brands__list > * {
    transition: opacity 0.5s var(--ease-editorial);
  }
}

@media (max-width: 560px) {
  .sw-brands__list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
