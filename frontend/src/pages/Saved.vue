<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useSavedStore } from '@/stores/saved';
import { applySeo, site } from '@/utils/seo';
import { staticSeo } from '@/seo/schema.mjs';
import WatchCard from '@/components/watch/WatchCard.vue';

const locale = useLocaleStore();
const saved = useSavedStore();

const hasError = ref(false);

/**
 * One visitor's own list — nothing here is the same page twice, and none of it
 * belongs in an index.
 */
function applyPageSeo() {
  const seo = staticSeo('saved', site);
  if (!seo) return;
  applySeo(seo);
}

async function load() {
  hasError.value = false;
  try {
    await saved.loadItems();
  } catch {
    hasError.value = true;
  }
}

onMounted(() => {
  applyPageSeo();
  void load();
});

// The cards carry localised copy, so a language change has to refetch them.
watch(
  () => locale.lang,
  () => {
    applyPageSeo();
    void load();
  },
);
</script>

<template>
  <div class="sw-saved">
    <header class="sw-saved__header">
      <span class="sw-eyebrow">{{ locale.t('saved.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('saved.title') }}</h1>
      <p class="sw-body-lg">{{ locale.t('saved.lede') }}</p>
    </header>

    <p v-if="saved.isLoadingItems" class="sw-body sw-saved__note">{{ locale.t('saved.loading') }}</p>

    <p v-else-if="hasError" class="sw-body sw-saved__note">{{ locale.t('saved.error') }}</p>

    <div v-else-if="!saved.items.length" class="sw-saved__empty">
      <h2 class="sw-h3">{{ locale.t('saved.emptyTitle') }}</h2>
      <p class="sw-body sw-saved__empty-body">{{ locale.t('saved.emptyBody') }}</p>
      <RouterLink class="sw-btn sw-btn--solid" to="/watches">
        {{ locale.t('saved.browse') }} <span class="sw-btn__arrow">&rarr;</span>
      </RouterLink>
    </div>

    <!-- No separate "remove" control: the card's own heart is already the
         switch that put the piece here, and it is the switch that takes it
         away again. -->
    <ul v-else class="sw-saved__grid">
      <li v-for="watch in saved.items" :key="watch._id">
        <WatchCard :watch="watch" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sw-saved {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 140px;
  max-width: var(--container-max);
  margin-inline: auto;
}

.sw-saved__header {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-saved__note {
  margin-top: 48px;
}

.sw-saved__empty {
  margin-top: 64px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.sw-saved__empty-body {
  max-width: 460px;
}

.sw-saved__empty .sw-btn--solid {
  margin-top: 8px;
}

.sw-saved__grid {
  list-style: none;
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: clamp(28px, 4vw, 56px) clamp(20px, 2.5vw, 36px);
}

@media (max-width: 460px) {
  .sw-saved__grid {
    grid-template-columns: 1fr;
  }
}
</style>
