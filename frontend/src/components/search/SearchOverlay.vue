<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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
const total = ref(0);
const isLoading = ref(false);
/** Shown before anything is typed, so the panel never opens empty. */
const suggestions = ref<Watch[]>([]);
const inputEl = ref<HTMLInputElement | null>(null);

const term = computed(() => query.value.trim());
const showSuggestions = computed(() => !term.value && suggestions.value.length > 0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let requestId = 0;

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (!value.trim()) {
    results.value = [];
    total.value = 0;
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  debounceTimer = setTimeout(async () => {
    // Keystrokes outrun responses: a slow request for "el" must not overwrite
    // the results already shown for "elemental".
    const id = ++requestId;
    try {
      const data = await fetchWatches({ q: value.trim(), limit: 8 });
      if (id !== requestId) return;
      results.value = data.items;
      total.value = data.total;
    } finally {
      if (id === requestId) isLoading.value = false;
    }
  }, 260);
});

/**
 * Suggestions are fetched the first time the panel opens, not on mount. The
 * panel is mounted on every page so the input can be focused inside the tap
 * that opens it — but that made its four product shots part of every page load
 * for a panel most visits never open.
 */
async function loadSuggestions() {
  if (suggestions.value.length) return;
  try {
    suggestions.value = (await fetchWatches({ featured: true, limit: 4 })).items;
  } catch {
    // The panel works without them; an empty strip is better than an error.
  }
}

watch(
  () => ui.isSearchOpen,
  (open) => {
    if (open) {
      void loadSuggestions();
      // Focus is also attempted synchronously from the header button, which is
      // what actually raises the keyboard on iOS. This is the fallback for
      // every other way the panel can be opened.
      inputEl.value?.focus();
    } else {
      query.value = '';
      results.value = [];
      total.value = 0;
    }
  },
);

function close() {
  ui.closeSearch();
}
</script>

<template>
  <!--
    Rendered at all times rather than behind v-if. iOS Safari only raises the
    keyboard when focus() runs inside the user's own tap, and an element that
    does not exist yet cannot be focused — so the panel is hidden with opacity
    instead of display, which keeps the input focusable the instant the header
    button is pressed. aria-hidden and tabindex keep it out of the tab order
    and away from screen readers while it is closed.
  -->
  <div
    class="sw-search"
    :class="{ 'is-open': ui.isSearchOpen }"
    :aria-hidden="ui.isSearchOpen ? undefined : 'true'"
    data-lenis-prevent
    role="dialog"
    aria-modal="true"
    :aria-label="locale.t('search.title')"
  >
    <button
      class="sw-search__close"
      type="button"
      :tabindex="ui.isSearchOpen ? undefined : -1"
      :aria-label="locale.t('search.close')"
      @click="close"
    >
      {{ locale.t('search.close') }}
    </button>

    <div class="sw-search__inner">
      <span class="sw-eyebrow">{{ locale.t('search.title') }}</span>

      <div class="sw-search__field">
        <input
          ref="inputEl"
          v-model="query"
          class="sw-search__input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          :tabindex="ui.isSearchOpen ? undefined : -1"
          :placeholder="locale.t('search.placeholder')"
          @keydown.esc="close"
        />
        <button
          v-if="term"
          class="sw-search__clear"
          type="button"
          :aria-label="locale.t('search.close')"
          @click="query = ''"
        >
          &times;
        </button>
      </div>

      <p class="sw-search__hint">{{ locale.t('search.hint') }}</p>

      <!-- Nothing typed yet: a few pieces rather than an empty screen. -->
      <section v-if="showSuggestions" class="sw-search__block">
        <span class="sw-eyebrow sw-search__block-title">{{ locale.t('search.suggested') }}</span>
        <ul class="sw-search__grid">
          <li v-for="watch in suggestions" :key="watch._id">
            <RouterLink :to="productPath(watch.slug)" class="sw-search__tile" @click="close">
              <div class="sw-search__tile-media">
                <SmartImage
                  :src="primaryImage(watch)"
                  :alt="watchImageAlt(watch)"
                  aspect-ratio="1 / 1"
                  object-fit="contain"
                  prefer-trimmed
                />
              </div>
              <span class="sw-search__tile-brand">{{ toBrandName(watch.brand) }}</span>
              <span class="sw-search__tile-name">{{ watch.name }}</span>
              <span class="sw-search__tile-price">{{ currency.format(watch.price) }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-else-if="term" class="sw-search__block">
        <p v-if="isLoading" class="sw-search__status">{{ locale.t('search.searching') }}</p>
        <p v-else-if="!results.length" class="sw-search__status">
          {{ locale.t('search.noResults') }} &ldquo;{{ term }}&rdquo;
        </p>
        <span v-else class="sw-eyebrow sw-search__block-title">
          {{ total }} {{ locale.t('search.resultCount') }}
        </span>

        <ul v-if="results.length" class="sw-search__list">
          <li v-for="watch in results" :key="watch._id">
            <RouterLink :to="productPath(watch.slug)" class="sw-search__result" @click="close">
              <div class="sw-search__result-media">
                <SmartImage
                  :src="primaryImage(watch)"
                  :alt="watchImageAlt(watch)"
                  aspect-ratio="1 / 1"
                  object-fit="contain"
                  prefer-trimmed
                />
              </div>
              <span class="sw-search__result-brand">{{ toBrandName(watch.brand) }}</span>
              <span class="sw-search__result-name">{{ watch.name }}</span>
              <span class="sw-search__result-price">{{ currency.format(watch.price) }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sw-search {
  position: fixed;
  inset: 0;
  /* Above the header (100). At 95 the header covered the top band of the
     panel, and the close button sits in exactly that band — so the only way
     out of the search was the Esc key. The panel is aria-modal, so nothing
     under it should be reachable anyway; while closed it is pointer-events:
     none and cannot block the header. */
  z-index: 110;
  background: var(--bg);
  color: var(--text);
  overflow-y: auto;
  overscroll-behavior: contain;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s var(--ease-out);
}

.sw-search.is-open {
  opacity: 1;
  pointer-events: auto;
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 140px var(--container-pad) 100px;
}

.sw-search__field {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 20px;
  border-bottom: 1px solid var(--border);
}

.sw-search__input {
  display: block;
  flex: 1;
  min-width: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 4vw, 3rem);
  padding-bottom: 20px;
}

.sw-search__input::placeholder {
  color: var(--sw-gray-400);
}

/* Safari draws its own clear affordance on type=search; ours matches the page. */
.sw-search__input::-webkit-search-cancel-button {
  display: none;
}

.sw-search__clear {
  flex: none;
  padding: 0 0 20px 16px;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-search__clear:hover {
  color: var(--text);
}

.sw-search__hint {
  margin-top: 14px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.sw-search__block {
  margin-top: clamp(40px, 6vw, 64px);
}

.sw-search__block-title {
  display: block;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.sw-search__status {
  font-size: 0.9375rem;
  color: var(--text-muted);
}

/* ---- Suggestions: a compact grid of tiles ---- */
.sw-search__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(16px, 2vw, 28px);
}

.sw-search__tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sw-search__tile-media {
  background: var(--surface-media);
  margin-bottom: 12px;
  overflow: hidden;
}

.sw-search__tile-media :deep(.sw-smart-image__img) {
  transition: transform 0.9s var(--ease-luxury);
}

.sw-search__tile:hover .sw-search__tile-media :deep(.sw-smart-image__img) {
  transform: scale(1.05);
}

.sw-search__tile-brand,
.sw-search__result-brand {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-search__tile-name,
.sw-search__result-name {
  font-family: var(--font-serif);
  font-size: 1rem;
  line-height: 1.3;
}

.sw-search__tile-price,
.sw-search__result-price {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* ---- Results: a row per piece ---- */
.sw-search__list {
  display: flex;
  flex-direction: column;
}

.sw-search__result {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  grid-template-areas:
    'media brand price'
    'media name  price';
  column-gap: 24px;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--hairline);
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-search__result:hover,
.sw-search__result:focus-visible {
  opacity: 0.62;
}

.sw-search__result-media {
  grid-area: media;
  background: var(--surface-media);
}

.sw-search__result-brand {
  grid-area: brand;
  align-self: end;
}

.sw-search__result-name {
  grid-area: name;
  align-self: start;
}

.sw-search__result-price {
  grid-area: price;
  text-align: right;
}

@media (max-width: 900px) {
  .sw-search__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .sw-search__inner {
    padding-top: 96px;
  }

  .sw-search__close {
    top: 22px;
  }

  /* The price moves under the name rather than competing with it for width. */
  .sw-search__result {
    grid-template-columns: 72px 1fr;
    grid-template-areas:
      'media brand'
      'media name'
      'media price';
    column-gap: 16px;
    row-gap: 2px;
  }

  .sw-search__result-price {
    text-align: left;
  }

  .sw-search__result-brand {
    align-self: center;
  }

  .sw-search__result-name,
  .sw-search__result-price {
    align-self: center;
  }
}
</style>
