<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Brand, Watch } from '@/types/models';
import { fetchBrandBySlug } from '@/services/brands';
import { fetchWatches } from '@/services/watches';
import { useMeta } from '@/composables/useMeta';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import WatchCard from '@/components/watch/WatchCard.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();

const PAGE_SIZE = 24;

const brand = ref<Brand | null>(null);
const watches = ref<Watch[]>([]);
const total = ref(0);
const page = ref(1);
const isLoadingMore = ref(false);
const notFound = ref(false);

const hasMore = computed(() => watches.value.length < total.value);

async function load(slug: string) {
  notFound.value = false;
  page.value = 1;
  try {
    brand.value = await fetchBrandBySlug(slug);
    useMeta(`${brand.value.name} — SwissWatch`, brand.value.description);
    const data = await fetchWatches({ brand: brand.value._id, page: page.value, limit: PAGE_SIZE });
    watches.value = data.items;
    total.value = data.total;
  } catch {
    notFound.value = true;
  }
}

async function loadMore() {
  if (!brand.value) return;
  isLoadingMore.value = true;
  try {
    page.value += 1;
    const data = await fetchWatches({ brand: brand.value._id, page: page.value, limit: PAGE_SIZE });
    watches.value = [...watches.value, ...data.items];
    total.value = data.total;
  } finally {
    isLoadingMore.value = false;
  }
}

onMounted(() => load(route.params.slug as string));
watch(
  () => route.params.slug,
  (slug) => slug && load(slug as string),
);
watch(
  () => locale.lang,
  () => load(route.params.slug as string),
);
</script>

<template>
  <div v-if="notFound" class="sw-brand-detail__notfound">
    <span class="sw-eyebrow">{{ locale.t('brandDetail.notFoundEyebrow') }}</span>
    <h1 class="sw-h1">{{ locale.t('brandDetail.notFoundTitle') }}</h1>
    <button class="sw-btn" type="button" @click="router.push('/brands')">{{ locale.t('brandDetail.backToBrands') }}</button>
  </div>

  <article v-else-if="brand" class="sw-brand-detail">
    <section class="sw-brand-detail__hero">
      <SmartImage :src="brand.image" :alt="brand.name" eager aspect-ratio="21 / 9" />
      <div class="sw-brand-detail__hero-overlay" />
      <div class="sw-brand-detail__hero-content">
        <span class="sw-eyebrow">{{ brand.country }}<template v-if="brand.founded"> &middot; {{ locale.t('brandDetail.est') }} {{ brand.founded }}</template></span>
        <h1 class="sw-display">{{ brand.name }}</h1>
      </div>
    </section>

    <section class="sw-brand-detail__body">
      <p class="sw-body-lg">{{ brand.description }}</p>
    </section>

    <section v-if="watches.length" class="sw-brand-detail__watches">
      <span class="sw-eyebrow">{{ locale.t('brandDetail.availableTimepieces') }}</span>
      <div class="sw-brand-detail__grid">
        <WatchCard v-for="watch in watches" :key="watch._id" :watch="watch" />
      </div>

      <div v-if="hasMore" class="sw-brand-detail__more">
        <button class="sw-btn" type="button" :disabled="isLoadingMore" @click="loadMore">
          {{ isLoadingMore ? locale.t('watchList.loading') : locale.t('watchList.loadMore') }}
          <span v-if="!isLoadingMore" class="sw-btn__arrow" aria-hidden="true">&darr;</span>
        </button>
      </div>
    </section>
  </article>
</template>

<style scoped>
.sw-brand-detail__hero {
  position: relative;
  color: var(--sw-white);
}

.sw-brand-detail__hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.2) 0%, rgba(10, 10, 10, 0.65) 100%);
}

.sw-brand-detail__hero-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 var(--container-pad) 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-brand-detail__body {
  max-width: 720px;
  padding: clamp(56px, 7vw, 96px) var(--container-pad) 0;
}

.sw-brand-detail__watches {
  padding: clamp(56px, 7vw, 96px) var(--container-pad) 120px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sw-brand-detail__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(24px, 3vw, 48px);
}

.sw-brand-detail__more {
  display: flex;
  justify-content: center;
  margin-top: clamp(24px, 3vw, 40px);
}

.sw-brand-detail__more .sw-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.sw-brand-detail__notfound {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
  padding: 0 var(--container-pad);
}

@media (max-width: 900px) {
  .sw-brand-detail__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .sw-brand-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
