<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Brand, Watch } from '@/types/models';
import { fetchBrands } from '@/services/brands';
import { fetchWatches } from '@/services/watches';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import { primaryImage } from '@/utils/format';
import { applyJsonLd, site } from '@/utils/seo';
import { brandPath, itemListSchema, watchImageAlt } from '@/seo/schema.mjs';

/** Shots previewed per brand card. Four fills the row at every breakpoint. */
const PREVIEW_COUNT = 4;

const locale = useLocaleStore();
const brands = ref<Brand[]>([]);
const isLoading = ref(true);
/** brand id → the first few pieces it holds, and how many it holds in total. */
const preview = ref<Record<string, { watches: Watch[]; total: number }>>({});

/**
 * A brand card carrying only a logo and a paragraph gave no reason to click:
 * the catalogue read as an empty page. Each card now shows what the brand
 * actually holds — the first few pieces and the real count — so the listing
 * is a view of the stock rather than an index of names.
 */
async function loadPreview(brand: Brand) {
  try {
    const data = await fetchWatches({ brand: brand._id, limit: PREVIEW_COUNT });
    preview.value = { ...preview.value, [brand._id]: { watches: data.items, total: data.total } };
  } catch {
    // A brand whose pieces fail to load still lists — it just shows no strip.
  }
}

async function load() {
  try {
    brands.value = await fetchBrands();
    // The brands actually listed, in the order they are rendered.
    applyJsonLd([
      itemListSchema(
        brands.value.map((b) => ({ name: b.name, path: brandPath(b.slug) })),
        site,
        'Watch brands',
      ),
    ]);
    preview.value = {};
    await Promise.all(brands.value.map(loadPreview));
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
          <SmartImage :src="brand.image" :alt="`${brand.name} watches`" aspect-ratio="16 / 10" />
        </div>

        <div class="sw-brand-list__head">
          <h2 class="sw-h3">{{ brand.name }}</h2>
          <span v-if="preview[brand._id]?.total" class="sw-brand-list__count">
            {{ preview[brand._id].total }} {{ locale.t('watchList.count') }}
          </span>
        </div>

        <p class="sw-body">{{ brand.description }}</p>

        <ul v-if="preview[brand._id]?.watches.length" class="sw-brand-list__pieces">
          <li v-for="piece in preview[brand._id].watches" :key="piece._id" class="sw-brand-list__piece">
            <SmartImage
              :src="primaryImage(piece)"
              :alt="watchImageAlt(piece)"
              aspect-ratio="1 / 1"
              object-fit="contain"
              prefer-trimmed
              sizes="(max-width: 720px) 22vw, 140px"
            />
          </li>
        </ul>

        <span class="sw-brand-list__cta">
          {{ locale.t('category.explore') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </span>
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

.sw-brand-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.sw-brand-list__count {
  flex: none;
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* The preview strip sits on the media surface, not the page, so a contain-fit
   shot reads as a framed piece rather than a cut-out floating on the card. */
.sw-brand-list__pieces {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.sw-brand-list__piece {
  background: var(--surface-media);
  overflow: hidden;
}

.sw-brand-list__piece :deep(.sw-smart-image__img) {
  transition: transform 0.9s var(--ease-luxury);
}

.sw-brand-list__item:hover .sw-brand-list__piece :deep(.sw-smart-image__img) {
  transform: scale(1.06);
}

.sw-brand-list__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
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
