<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Brand } from '@/types/models';
import { fetchBrands } from '@/services/brands';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();
const brands = ref<Brand[]>([]);
const isLoading = ref(true);

async function load() {
  try {
    brands.value = await fetchBrands();
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
watch(() => locale.lang, load);
</script>

<template>
  <div class="sw-brand-list">
    <header class="sw-brand-list__header">
      <span class="sw-eyebrow">{{ locale.t('brandList.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('brandList.title') }}</h1>
    </header>

    <div class="sw-brand-list__grid">
      <RouterLink
        v-for="brand in brands"
        :key="brand._id"
        :to="`/brands/${brand.slug}`"
        class="sw-brand-list__item"
      >
        <div class="sw-brand-list__media">
          <SmartImage :src="brand.image" :alt="brand.name" aspect-ratio="16 / 10" />
        </div>
        <h2 class="sw-h3">{{ brand.name }}</h2>
        <p class="sw-body">{{ brand.description }}</p>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.sw-brand-list {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 120px;
}

.sw-brand-list__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 64px;
}

.sw-brand-list__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(32px, 4vw, 64px);
}

.sw-brand-list__item {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sw-brand-list__media {
  overflow: hidden;
}

.sw-brand-list__media :deep(.sw-smart-image__img) {
  transition: transform 1.1s var(--ease-luxury);
}

.sw-brand-list__item:hover .sw-brand-list__media :deep(.sw-smart-image__img) {
  transform: scale(1.04);
}

@media (max-width: 720px) {
  .sw-brand-list__grid {
    grid-template-columns: 1fr;
  }
}
</style>
