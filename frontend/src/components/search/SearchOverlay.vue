<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { useLockBodyScroll } from '@/composables/useLockBodyScroll';
import { fetchWatches } from '@/services/watches';
import type { Watch } from '@/types/models';
import { toBrandName, primaryImage } from '@/utils/format';
import SmartImage from '@/components/shared/SmartImage.vue';
import { productPath, watchImageAlt } from '@/seo/schema.mjs';

const ui = useUiStore();
const locale = useLocaleStore();
const currency = useCurrencyStore();
useLockBodyScroll(computed(() => ui.isSearchOpen));

const query = ref('');
const results = ref<Watch[]>([]);
const isLoading = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (!value.trim()) {
    results.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  debounceTimer = setTimeout(async () => {
    try {
      const data = await fetchWatches({ q: value.trim(), limit: 8 });
      results.value = data.items;
    } finally {
      isLoading.value = false;
    }
  }, 320);
});

watch(
  () => ui.isSearchOpen,
  async (open) => {
    if (open) {
      await nextTick();
      inputEl.value?.focus();
    } else {
      query.value = '';
      results.value = [];
    }
  },
);

function close() {
  ui.closeSearch();
}
</script>

<template>
  <transition name="sw-fade">
    <div v-if="ui.isSearchOpen" class="sw-search" data-lenis-prevent role="dialog" aria-modal="true" :aria-label="locale.t('search.title')">
      <button class="sw-search__close" type="button" :aria-label="locale.t('search.close')" @click="close">{{ locale.t('search.close') }}</button>

      <div class="sw-search__inner">
        <span class="sw-eyebrow">{{ locale.t('search.title') }}</span>
        <input
          ref="inputEl"
          v-model="query"
          class="sw-search__input"
          type="search"
          :placeholder="locale.t('search.placeholder')"
          autocomplete="off"
        />

        <div class="sw-search__results">
          <p v-if="isLoading" class="sw-body">{{ locale.t('search.searching') }}</p>
          <p v-else-if="query && !results.length" class="sw-body">{{ locale.t('search.noResults') }} &ldquo;{{ query }}&rdquo;.</p>

          <RouterLink
            v-for="watch in results"
            :key="watch._id"
            :to="productPath(watch.slug)"
            class="sw-search__result"
            @click="close"
          >
            <div class="sw-search__result-media">
              <SmartImage :src="primaryImage(watch)" :alt="watchImageAlt(watch)" />
            </div>
            <div class="sw-search__result-info">
              <span class="sw-label">{{ toBrandName(watch.brand) }}</span>
              <span class="sw-h3">{{ watch.name }}</span>
              <span class="sw-body">{{ currency.format(watch.price) }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sw-search {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: var(--bg);
  color: var(--text);
  overflow-y: auto;
}

.sw-search__close {
  position: absolute;
  top: 28px;
  right: var(--container-pad);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  z-index: 2;
}

.sw-search__inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 140px var(--container-pad) 100px;
}

.sw-search__input {
  display: block;
  width: 100%;
  margin-top: 20px;
  font-family: var(--font-serif);
  font-size: clamp(1.75rem, 4vw, 3rem);
  border-bottom: 1px solid var(--border);
  padding-bottom: 20px;
}

.sw-search__input::placeholder {
  color: var(--sw-gray-400);
}

.sw-search__results {
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.sw-search__result {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 24px;
  align-items: center;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-search__result:hover {
  opacity: 0.6;
}

.sw-search__result-media {
  aspect-ratio: 3 / 4;
}

.sw-search__result-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
