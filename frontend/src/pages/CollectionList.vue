<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Collection } from '@/types/models';
import { fetchCollections } from '@/services/collections';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import { applyJsonLd, site } from '@/utils/seo';
import { collectionPath, itemListSchema } from '@/seo/schema.mjs';

const locale = useLocaleStore();
const collections = ref<Collection[]>([]);

// Tsar Bomba splits its line-up by audience, so the page does too: the men's series
// first, then Nucleus Femme. An audience with no collections drops out entirely.
const groups = computed(() =>
  (['men', 'women'] as const)
    .map((gender) => ({ gender, items: collections.value.filter((c) => c.gender === gender) }))
    .filter((group) => group.items.length > 0),
);

async function load() {
  collections.value = await fetchCollections();
  applyJsonLd([
    itemListSchema(
      collections.value.map((c) => ({ name: c.name, path: collectionPath(c.slug) })),
      site,
      'Watch collections',
    ),
  ]);
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

    <section v-for="group in groups" :key="group.gender" class="sw-collections__group">
      <h2 class="sw-collections__group-title">{{ locale.t(`collectionList.${group.gender}`) }}</h2>

      <div class="sw-collections__list">
        <RouterLink
          v-for="collection in group.items"
          :key="collection._id"
          :to="`/collections/${collection.slug}`"
          class="sw-collections__item"
        >
          <div class="sw-collections__media">
            <SmartImage :src="collection.image" :alt="`${collection.name} watch collection`" aspect-ratio="21 / 9" />
          </div>
          <div class="sw-collections__text">
            <h3 class="sw-h2">{{ collection.name }}</h3>
            <p class="sw-body">{{ collection.description }}</p>
            <span class="sw-btn">{{ locale.t('collectionList.explore') }} <span class="sw-btn__arrow">&rarr;</span></span>
          </div>
        </RouterLink>
      </div>
    </section>
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

.sw-collections__group + .sw-collections__group {
  margin-top: 112px;
}

.sw-collections__group-title {
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-bottom: 20px;
  margin-bottom: 56px;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.16));
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
