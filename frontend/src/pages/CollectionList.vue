<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Collection } from '@/types/models';
import { fetchCollections } from '@/services/collections';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();
const collections = ref<Collection[]>([]);

async function load() {
  collections.value = await fetchCollections();
}

onMounted(load);
// Names/descriptions come pre-localized from the API by `lang` query param —
// switching the language selector mid-visit has to re-fetch, or this content
// stays frozen in whatever language was active on first load.
watch(() => locale.lang, load);
</script>

<template>
  <div class="sw-collections">
    <header class="sw-collections__header">
      <span class="sw-eyebrow">{{ locale.t('collectionList.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('collectionList.title') }}</h1>
    </header>

    <div class="sw-collections__list">
      <RouterLink
        v-for="collection in collections"
        :key="collection._id"
        :to="`/collections/${collection.slug}`"
        class="sw-collections__item"
      >
        <div class="sw-collections__media">
          <SmartImage :src="collection.image" :alt="collection.name" aspect-ratio="21 / 9" />
        </div>
        <div class="sw-collections__text">
          <h2 class="sw-h2">{{ collection.name }}</h2>
          <p class="sw-body">{{ collection.description }}</p>
          <span class="sw-btn">{{ locale.t('collectionList.explore') }} <span class="sw-btn__arrow">&rarr;</span></span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.sw-collections {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 120px;
}

.sw-collections__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 64px;
}

.sw-collections__list {
  display: flex;
  flex-direction: column;
  gap: 80px;
}

.sw-collections__media {
  overflow: hidden;
}

.sw-collections__media :deep(.sw-smart-image__img) {
  transition: transform 1.1s var(--ease-luxury);
}

.sw-collections__item:hover .sw-collections__media :deep(.sw-smart-image__img) {
  transform: scale(1.03);
}

.sw-collections__text {
  margin-top: 24px;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
