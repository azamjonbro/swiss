<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Collection, Watch } from '@/types/models';
import { fetchCollectionBySlug } from '@/services/collections';
import { useMeta } from '@/composables/useMeta';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import WatchCard from '@/components/watch/WatchCard.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();

const collection = ref<Collection | null>(null);
const notFound = ref(false);

async function load(slug: string) {
  notFound.value = false;
  try {
    collection.value = await fetchCollectionBySlug(slug);
    useMeta(`${collection.value.name} — SwissWatch`, collection.value.description);
  } catch {
    notFound.value = true;
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
  <div v-if="notFound" class="sw-collection-detail__notfound">
    <span class="sw-eyebrow">{{ locale.t('collectionDetail.notFoundEyebrow') }}</span>
    <h1 class="sw-h1">{{ locale.t('collectionDetail.notFoundTitle') }}</h1>
    <button class="sw-btn" type="button" @click="router.push('/collections')">{{ locale.t('collectionDetail.backToCollections') }}</button>
  </div>

  <article v-else-if="collection" class="sw-collection-detail">
    <section class="sw-collection-detail__hero">
      <SmartImage :src="collection.image" :alt="collection.name" eager aspect-ratio="21 / 9" />
      <div class="sw-collection-detail__overlay" />
      <div class="sw-collection-detail__content">
        <span class="sw-eyebrow">{{ locale.t('collectionDetail.curated') }}</span>
        <h1 class="sw-display">{{ collection.name }}</h1>
        <p class="sw-body-lg">{{ collection.description }}</p>
      </div>
    </section>

    <section class="sw-collection-detail__grid">
      <WatchCard v-for="watch in (collection.watches as Watch[])" :key="watch._id" :watch="watch" />
    </section>
  </article>
</template>

<style scoped>
.sw-collection-detail__hero {
  position: relative;
  color: var(--sw-white);
}

.sw-collection-detail__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.25) 0%, rgba(10, 10, 10, 0.7) 100%);
}

.sw-collection-detail__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 var(--container-pad) 64px;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-collection-detail__grid {
  padding: clamp(64px, 8vw, 120px) var(--container-pad);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(24px, 3vw, 48px);
}

.sw-collection-detail__notfound {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
  padding: 0 var(--container-pad);
}

@media (max-width: 900px) {
  .sw-collection-detail__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .sw-collection-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
