<script setup lang="ts">
import { ref } from 'vue';
import type { Brand, Watch } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import WatchCard from '@/components/watch/WatchCard.vue';

interface Props {
  brands: Brand[];
}

defineProps<Props>();
const locale = useLocaleStore();

const activeBrand = ref<Brand | null>(null);
const watches = ref<Watch[]>([]);
const isLoading = ref(false);

const watchesCache = ref<Record<string, Watch[]>>({});

async function loadWatches(brandId: string) {
  if (watchesCache.value[brandId]) {
    watches.value = watchesCache.value[brandId];
    return;
  }

  isLoading.value = true;
  try {
    const res = await fetchWatches({ brand: brandId, limit: 4 });
    watchesCache.value[brandId] = res.items;
    watches.value = res.items;
  } catch (err) {
    console.error('Failed to load watches for brand', err);
  } finally {
    isLoading.value = false;
  }
}

function onBrandHover(brand: Brand) {
  activeBrand.value = brand;
  loadWatches(brand._id);
}
</script>

<template>
  <section class="sw-brands">
    <div class="sw-brands__header">
      <span class="sw-eyebrow">{{ locale.t('brandsSection.eyebrow') }}</span>
      <h2 class="sw-h2">{{ locale.t('brandsSection.title') }}</h2>
    </div>

    <ul class="sw-brands__list">
      <li v-for="brand in brands" :key="brand._id" class="sw-brands__item" @mouseenter="onBrandHover(brand)">
        <RouterLink
          :to="`/brands/${brand.slug}`"
          class="sw-brands__link"
          :class="{ 'is-active': activeBrand?._id === brand._id }"
          data-cursor="View"
        >
          <div class="sw-brands__plaque">
            <SmartImage :src="brand.logo" :alt="brand.name" aspect-ratio="1 / 1" />
            <div class="sw-brands__scrim" />
            <span class="sw-label sw-brands__name">{{ brand.name }}</span>
          </div>
        </RouterLink>
      </li>
    </ul>

    <div v-if="activeBrand" class="sw-brands__watches">
      <h3 class="sw-h3 sw-brands__watches-title">{{ locale.t('brandsSection.explorePrefix') }} {{ activeBrand.name }}</h3>
      <div v-if="isLoading" class="sw-brands__loading">{{ locale.t('brandsSection.loading') }}</div>
      <div v-else-if="!watches.length" class="sw-brands__empty">{{ locale.t('brandsSection.empty') }}</div>
      <div v-else class="sw-brands__watches-grid">
        <WatchCard v-for="watch in watches" :key="watch._id" :watch="watch" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sw-brands {
  padding: clamp(64px, 8vw, 120px) var(--container-pad);
  background: var(--sw-ivory);
}

.sw-brands__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: clamp(40px, 5vw, 72px);
}

.sw-brands__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: clamp(16px, 2vw, 28px);
}

.sw-brands__link {
  display: block;
}

.sw-brands__plaque {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  transition: transform var(--dur-mid) var(--ease-luxury), box-shadow var(--dur-mid) var(--ease-luxury);
}

.sw-brands__plaque :deep(.sw-smart-image__img) {
  transition: transform 1.1s var(--ease-luxury);
}

.sw-brands__link:hover .sw-brands__plaque,
.sw-brands__link.is-active .sw-brands__plaque {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px -20px rgba(10, 10, 10, 0.35);
}

.sw-brands__link:hover .sw-brands__plaque :deep(.sw-smart-image__img),
.sw-brands__link.is-active .sw-brands__plaque :deep(.sw-smart-image__img) {
  transform: scale(1.045);
}

.sw-brands__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0) 55%, rgba(10, 10, 10, 0.78) 100%);
  pointer-events: none;
}

.sw-brands__name {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 14px;
  color: var(--sw-white);
  letter-spacing: 0.08em;
}

.sw-brands__watches {
  margin-top: clamp(48px, 6vw, 80px);
  padding-top: clamp(48px, 6vw, 80px);
  border-top: 1px solid var(--border);
  animation: sw-fade-in var(--dur-mid) var(--ease-out);
}

.sw-brands__watches-title {
  margin-bottom: 32px;
  text-align: center;
}

.sw-brands__loading,
.sw-brands__empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 0;
}

.sw-brands__watches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}

@keyframes sw-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .sw-brands__list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
