<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Watch, Collection } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { fetchCollections } from '@/services/collections';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { colorSwatchHex, movementType } from '@/utils/format';
import { useLockBodyScroll } from '@/composables/useLockBodyScroll';
import { applyJsonLd, applySeo, site } from '@/utils/seo';
import { itemListSchema, productPath, staticSeo, watchFullName } from '@/seo/schema.mjs';
import WatchCard from '@/components/watch/WatchCard.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();
const currency = useCurrencyStore();

// The catalog is every active product the API returns. It used to resolve one
// brand by slug and scope the query to its id, which meant the listing could
// never show a second brand: adding one to the database left it invisible here,
// reachable only from /brands/<slug>. The facets below are derived from
// whatever comes back, so they widen on their own as the catalog does.
/**
 * The grid filters and sorts client-side, so it asks for the whole catalog at
 * once. That is fine at the current size and has a hard ceiling rather than an
 * open-ended one; past it the listing needs real pagination (see the note in
 * SEO-AUDIT.md) instead of a larger number here.
 */
const CATALOG_LIMIT = 600;

const allWatches = ref<Watch[]>([]);
const collections = ref<Collection[]>([]);
const isLoading = ref(true);

const selectedGender = ref((route.query.gender as string) ?? '');
const selectedCollection = ref((route.query.collection as string) ?? '');
// Watches are the catalogue; straps, bezels and crowns are opt-in from this facet
// rather than something a visitor has to filter back out of the grid.
const selectedType = ref((route.query.type as string) || 'watch');
const selectedColor = ref((route.query.color as string) ?? '');
// Local UI state only — never synced to the URL. The catalog carries 80+
// distinct color names (Tsar Bomba's variant naming is far from consistent),
// too many to browse as a flat list, so the color section gets a type-to-filter
// search on top of it.
const colorSearch = ref('');
const selectedMovement = ref((route.query.movement as string) ?? '');
const selectedPriceBand = ref((route.query.price as string) ?? '');
const selectedAvailability = ref((route.query.availability as string) ?? '');
const isNewOnly = ref(route.query.isNew === 'true');
const sortKey = ref((route.query.sort as string) || 'newest');

/**
 * Rows of the grid, not a network page: the whole catalogue already arrives in
 * one request (see CATALOG_LIMIT) because every facet below is derived from it,
 * so paging here slices the sorted result rather than re-querying. What it buys
 * is the render — 600 cards mounted at once meant 600 `<img>` elements and 600
 * IntersectionObservers on first paint, and a filter change re-diffed all of
 * them.
 */
const PAGE_SIZE = 15;

const page = ref(pageFromQuery(route.query.page));

function pageFromQuery(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

const isFilterOpen = ref(false);
const isSortOpen = ref(false);
const sortWrapRef = ref<HTMLElement | null>(null);

useLockBodyScroll(isFilterOpen);

function onWindowClick(event: MouseEvent) {
  if (isSortOpen.value && sortWrapRef.value && !sortWrapRef.value.contains(event.target as Node)) {
    isSortOpen.value = false;
  }
}
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (isFilterOpen.value) isFilterOpen.value = false;
  if (isSortOpen.value) isSortOpen.value = false;
}
onMounted(() => {
  window.addEventListener('click', onWindowClick);
  window.addEventListener('keydown', onWindowKeydown);
});
onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
  window.removeEventListener('keydown', onWindowKeydown);
});

const PRICE_BANDS = [
  { key: 'under-500', test: (p: number) => p < 500 },
  { key: '500-1500', test: (p: number) => p >= 500 && p < 1500 },
  { key: '1500-3000', test: (p: number) => p >= 1500 && p < 3000 },
  { key: '3000-plus', test: (p: number) => p >= 3000 },
];

function priceBandLabel(key: string): string {
  switch (key) {
    case 'under-500':
      return `${locale.t('common.under')} ${currency.format(500)}`;
    case '500-1500':
      return `${currency.format(500)} – ${currency.format(1500)}`;
    case '1500-3000':
      return `${currency.format(1500)} – ${currency.format(3000)}`;
    default:
      return `${currency.format(3000)}+`;
  }
}

const SORT_KEYS = ['newest', 'price-asc', 'price-desc'] as const;
function sortLabel(key: string): string {
  switch (key) {
    case 'price-asc':
      return locale.t('watchList.sortPriceAsc');
    case 'price-desc':
      return locale.t('watchList.sortPriceDesc');
    default:
      return locale.t('watchList.sortNewest');
  }
}

async function load() {
  isLoading.value = true;
  try {
    // `type: 'all'` pulls the accessories in alongside the watches so the grid can
    // filter between them client-side; the limit clears the whole catalogue in one go.
    const [data, cols] = await Promise.all([
      fetchWatches({ type: 'all', limit: CATALOG_LIMIT }),
      fetchCollections(),
    ]);
    allWatches.value = data.items;
    collections.value = cols;
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
watch(() => locale.lang, load);

// Facets are derived from the loaded catalog — only values actually
// present in the data become filter options, never invented ones.
const genderOptions = computed(() =>
  (['men', 'women'] as const).filter((g) => allWatches.value.some((w) => w.gender === g)),
);

// Collection is a real facet now that every product carries a `collectionRef` taken
// from the brand's own series grouping; only collections holding something in the
// current result set are offered.
const collectionOptions = computed(() => {
  const present = new Set(allWatches.value.map((w) => collectionIdOf(w)).filter(Boolean));
  return collections.value.filter((c) => present.has(c._id));
});

const typeOptions = computed(() => {
  const present = (['watch', 'accessory'] as const).filter((t) =>
    allWatches.value.some((w) => (w.type ?? 'watch') === t),
  );
  return present.length > 1 ? [...present, 'all' as const] : present;
});

function typeLabel(t: string): string {
  return t === 'all' ? locale.t('watchList.allTypes') : locale.t(`watchList.type_${t}`);
}

/** `collectionRef` arrives either populated or as a bare id, depending on the endpoint. */
function collectionIdOf(w: Watch): string {
  const ref = w.collectionRef as unknown;
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ((ref as { _id?: string })._id ?? '');
}

function collectionLabel(id: string): string {
  return collections.value.find((c) => c._id === id)?.name ?? id;
}
// Accessory "variants" are rarely a color at all — strap colors are genuine,
// but a lot of them are the accessory's own component/bundle name ("2-in-1
// Display Box", "Atomic Series", a bare price code) standing in for a color
// nobody entered. Mixing those into the watch color list is most of why it
// felt overgrown, so the facet is scoped to whatever product type is
// currently in view rather than built from the full unfiltered catalog.
const colorScopeWatches = computed(() =>
  selectedType.value === 'all'
    ? allWatches.value
    : allWatches.value.filter((w) => (w.type ?? 'watch') === selectedType.value),
);

const colorOptions = computed(() => {
  const map = new Map<string, string>();
  for (const w of colorScopeWatches.value) {
    for (const v of w.variants ?? []) {
      if (v.colorLabel) map.set(v.colorSlug, v.colorLabel);
    }
  }
  return Array.from(map, ([colorSlug, colorLabel]) => ({ colorSlug, colorLabel })).sort((a, b) =>
    a.colorLabel.localeCompare(b.colorLabel),
  );
});

const filteredColorOptions = computed(() => {
  const q = colorSearch.value.trim().toLowerCase();
  if (!q) return colorOptions.value;
  return colorOptions.value.filter((c) => c.colorLabel.toLowerCase().includes(q));
});

const colorCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const w of colorScopeWatches.value) {
    const slugs = new Set((w.variants ?? []).map((v) => v.colorSlug));
    for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
});

const movementOptions = computed(() => {
  const set = new Set<string>();
  for (const w of allWatches.value) {
    const t = movementType(w.movement);
    if (t) set.add(t);
  }
  return Array.from(set);
});

const availabilityOptions = computed(() => {
  const set = new Set<string>();
  for (const w of allWatches.value) set.add(w.availability);
  return Array.from(set);
});

const priceBandOptions = computed(() =>
  PRICE_BANDS.filter((band) => allWatches.value.some((w) => band.test(w.price))).map((band) => band.key),
);

function availabilityLabel(a: string): string {
  return locale.t(`watchDetail.${a === 'in-stock' ? 'available' : a === 'made-to-order' ? 'madeToOrder' : a}`);
}

const filteredWatches = computed(() => {
  return allWatches.value.filter((w) => {
    if (selectedGender.value && w.gender !== selectedGender.value) return false;
    if (selectedCollection.value && collectionIdOf(w) !== selectedCollection.value) return false;
    if (selectedType.value !== 'all' && (w.type ?? 'watch') !== selectedType.value) return false;
    if (isNewOnly.value && !w.isNewArrival) return false;
    if (selectedColor.value && !w.variants?.some((v) => v.colorSlug === selectedColor.value)) return false;
    if (selectedMovement.value && movementType(w.movement) !== selectedMovement.value) return false;
    if (selectedAvailability.value && w.availability !== selectedAvailability.value) return false;
    if (selectedPriceBand.value) {
      const band = PRICE_BANDS.find((b) => b.key === selectedPriceBand.value);
      if (band && !band.test(w.price)) return false;
    }
    return true;
  });
});

const sortedWatches = computed(() => {
  const list = filteredWatches.value.slice();
  if (sortKey.value === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sortKey.value === 'price-desc') list.sort((a, b) => b.price - a.price);
  return list;
});

const pageCount = computed(() => Math.max(1, Math.ceil(sortedWatches.value.length / PAGE_SIZE)));

const pagedWatches = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return sortedWatches.value.slice(start, start + PAGE_SIZE);
});

/**
 * The numbers actually rendered: first, last, the current page and one either
 * side, with a gap marker wherever the sequence jumps. A flat run of numbers
 * is fine at five pages and unusable at forty, and the catalogue is already
 * past thirty.
 */
const pageItems = computed<(number | 'gap')[]>(() => {
  const last = pageCount.value;
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const current = page.value;
  const wanted = new Set([1, last, current, current - 1, current + 1]);
  // Keep the row a constant width, so the numbers do not shuffle sideways as
  // the reader walks through the pages.
  if (current <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (current >= last - 2) [last - 3, last - 2, last - 1].forEach((n) => wanted.add(n));

  const numbers = [...wanted].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  numbers.forEach((n, i) => {
    if (i > 0 && n - numbers[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
});

/**
 * Real links, not buttons wired to a click handler: a paginated catalogue that
 * a crawler cannot walk is a catalogue where everything past the first fifteen
 * products is unreachable, and middle-click / open-in-new-tab are what a
 * shopper comparing pieces actually does. Pushing (rather than the `replace`
 * the filters use) is deliberate too — Back should return to the page the
 * reader came from. The router's scrollBehavior takes care of the scroll.
 */
/** "16–30" — which slice of the result set the grid is currently showing. */
const shownRange = computed(() => {
  const first = (page.value - 1) * PAGE_SIZE + 1;
  const last = Math.min(page.value * PAGE_SIZE, sortedWatches.value.length);
  return `${first}\u2013${last}`;
});

function pageLink(n: number) {
  return { query: { ...route.query, page: n > 1 ? String(n) : undefined } };
}

// Narrowing the result set can leave the reader stranded past the last page —
// page 12 of a filter that now yields two pages renders an empty grid. Clamp
// rather than reset: staying as deep as the new result set allows is closer to
// where they were than jumping back to the first page.
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});

interface FilterChip {
  key: string;
  label: string;
  clear: () => void;
}

const activeFilterChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = [];
  if (selectedGender.value) {
    chips.push({
      key: 'gender',
      label: locale.t(`watchList.gender_${selectedGender.value}`),
      clear: () => (selectedGender.value = ''),
    });
  }
  if (selectedCollection.value) {
    chips.push({
      key: 'collection',
      label: collectionLabel(selectedCollection.value),
      clear: () => (selectedCollection.value = ''),
    });
  }
  if (selectedType.value !== 'watch') {
    chips.push({
      key: 'type',
      label: typeLabel(selectedType.value),
      clear: () => (selectedType.value = 'watch'),
    });
  }
  if (selectedColor.value) {
    const c = colorOptions.value.find((c) => c.colorSlug === selectedColor.value);
    chips.push({ key: 'color', label: c?.colorLabel ?? selectedColor.value, clear: () => (selectedColor.value = '') });
  }
  if (selectedPriceBand.value) {
    chips.push({ key: 'price', label: priceBandLabel(selectedPriceBand.value), clear: () => (selectedPriceBand.value = '') });
  }
  if (selectedMovement.value) {
    chips.push({ key: 'movement', label: selectedMovement.value, clear: () => (selectedMovement.value = '') });
  }
  if (selectedAvailability.value) {
    chips.push({
      key: 'availability',
      label: availabilityLabel(selectedAvailability.value),
      clear: () => (selectedAvailability.value = ''),
    });
  }
  if (isNewOnly.value) {
    chips.push({ key: 'new', label: locale.t('nav.newArrivals'), clear: () => (isNewOnly.value = false) });
  }
  return chips;
});

const hasActiveFilters = computed(() => activeFilterChips.value.length > 0);
const activeFilterCount = computed(() => activeFilterChips.value.length);

function syncQuery() {
  router.replace({
    query: {
      gender: selectedGender.value || undefined,
      collection: selectedCollection.value || undefined,
      type: selectedType.value !== 'watch' ? selectedType.value : undefined,
      color: selectedColor.value || undefined,
      movement: selectedMovement.value || undefined,
      price: selectedPriceBand.value || undefined,
      availability: selectedAvailability.value || undefined,
      isNew: isNewOnly.value ? 'true' : undefined,
      sort: sortKey.value !== 'newest' ? sortKey.value : undefined,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  });
}

/** Everything that changes *which* products are listed, as one comparable key. */
const filterState = computed(() =>
  [
    selectedGender.value,
    selectedCollection.value,
    selectedType.value,
    selectedColor.value,
    selectedMovement.value,
    selectedPriceBand.value,
    selectedAvailability.value,
    String(isNewOnly.value),
    sortKey.value,
  ].join('|'),
);

// A new filter is a new result set, so the old offset means nothing — page 4 of
// the unfiltered catalogue is not page 4 of "green, under $500".
watch(filterState, () => {
  page.value = 1;
});

watch([filterState, page], syncQuery);

// Back/forward moves between pages without remounting this component, and
// syncQuery uses `replace`, so the only query changes that arrive from outside
// are real history navigations — follow them.
watch(
  () => route.query.page,
  (value) => {
    const next = pageFromQuery(value);
    if (next !== page.value) page.value = next;
  },
);

/**
 * The catalog is one indexable URL. Filter and sort state lives in the query
 * string for sharing and back-button behaviour, so canonical always points at
 * the bare /watches, and a filtered view is additionally marked noindex —
 * every combination of eight filters must never become its own thin page.
 * `follow` is kept so the products linked from a filtered view still get
 * crawled.
 */
function applyListSeo() {
  const seo = staticSeo('watches', site);
  if (!seo) return;
  const isFiltered = hasActiveFilters.value || sortKey.value !== 'newest';
  // Pagination is the exception to the rule above: page 2 is not a slice of
  // page 1's content, it is the next fifteen products, and each such page is
  // worth its own entry. So a paginated view canonicalises to *itself* and
  // stays indexable — the numbers are real <a> links (see the template), so
  // this is also how a crawler reaches everything past the first page. A
  // filtered view is still one thin combination of eight facets and stays out.
  const paged = page.value > 1 ? `/watches?page=${page.value}` : '/watches';
  applySeo({
    ...seo,
    // Page 1 keeps the plain title; deeper pages say where they are, so the
    // result rows in search are not thirty copies of one string.
    title: page.value > 1 ? `${seo.title} — ${locale.t('watchList.page')} ${page.value}` : seo.title,
    canonical: isFiltered ? '/watches' : paged,
    robots: isFiltered ? 'noindex, follow' : 'index, follow',
  });
  applyJsonLd([
    // What this page actually lists, in the order it lists it — not a 60-item
    // digest of a list the visitor cannot see.
    itemListSchema(
      pagedWatches.value.map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
      site,
      'Timepieces',
    ),
  ]);
}

watch([hasActiveFilters, sortKey, pagedWatches, page], applyListSeo, { immediate: true });

function clearFilters() {
  selectedGender.value = '';
  selectedCollection.value = '';
  selectedType.value = 'watch';
  selectedColor.value = '';
  selectedMovement.value = '';
  selectedPriceBand.value = '';
  selectedAvailability.value = '';
  isNewOnly.value = false;
}

function selectSort(key: string) {
  sortKey.value = key;
  isSortOpen.value = false;
}
</script>

<template>
  <div class="sw-watchlist">
    <header class="sw-watchlist__header">
      <div class="sw-watchlist__heading">
        <span class="sw-eyebrow">{{ locale.t('watchList.eyebrow') }}</span>
        <h1 class="sw-h1">{{ locale.t('watchList.title') }}</h1>
      </div>
      <p class="sw-watchlist__result-count sw-meta">
        <template v-if="pageCount > 1">{{ shownRange }} {{ locale.t('common.of') }} </template
        >{{ sortedWatches.length }} {{ locale.t('watchList.count') }}
      </p>
    </header>

    <div class="sw-watchlist__toolbar">
      <button class="sw-watchlist__toolbar-btn" type="button" @click="isFilterOpen = true">
        {{ locale.t('watchList.filters') }}
        <span v-if="activeFilterCount" class="sw-watchlist__toolbar-count">· {{ activeFilterCount }}</span>
      </button>

      <div class="sw-watchlist__sort" ref="sortWrapRef">
        <button
          class="sw-watchlist__toolbar-btn"
          type="button"
          :aria-expanded="isSortOpen"
          @click="isSortOpen = !isSortOpen"
        >
          {{ locale.t('watchList.sort') }}
        </button>
        <transition name="sw-fade">
          <div v-if="isSortOpen" class="sw-watchlist__sort-menu" role="menu">
            <button
              v-for="key in SORT_KEYS"
              :key="key"
              type="button"
              class="sw-watchlist__sort-option"
              :class="{ 'is-active': sortKey === key }"
              role="menuitemradio"
              :aria-checked="sortKey === key"
              @click="selectSort(key)"
            >
              {{ sortLabel(key) }}
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div v-if="hasActiveFilters" class="sw-watchlist__active">
      <button v-for="chip in activeFilterChips" :key="chip.key" type="button" class="sw-watchlist__chip" @click="chip.clear()">
        {{ chip.label }} <span aria-hidden="true">&times;</span>
      </button>
      <button type="button" class="sw-watchlist__clear-all" @click="clearFilters">
        {{ locale.t('watchList.clearFilters') }}
      </button>
    </div>

    <p v-if="!isLoading && !sortedWatches.length" class="sw-body sw-watchlist__empty">
      {{ locale.t('watchList.empty') }}
    </p>

    <template v-else>
      <div class="sw-watchlist__grid">
        <!-- The first row is above the fold at every breakpoint (four columns
             on a desktop, one on a phone), so those covers are fetched eagerly
             rather than queueing behind the lazy loader — they are what the
             page is, and everything below them can wait for the scroll. -->
        <WatchCard
          v-for="(watch, index) in pagedWatches"
          :key="watch._id"
          :watch="watch"
          :priority="index < 4"
        />
      </div>

      <nav v-if="pageCount > 1" class="sw-pager" :aria-label="locale.t('watchList.pagination')">
        <RouterLink
          v-if="page > 1"
          :to="pageLink(page - 1)"
          class="sw-pager__step"
          :aria-label="locale.t('watchList.prevPage')"
          rel="prev"
        >
          <span aria-hidden="true">&larr;</span> {{ locale.t('watchList.prevPage') }}
        </RouterLink>
        <span v-else class="sw-pager__step is-disabled" aria-hidden="true">
          <span>&larr;</span> {{ locale.t('watchList.prevPage') }}
        </span>

        <ol class="sw-pager__numbers">
          <li v-for="(item, i) in pageItems" :key="`${item}-${i}`">
            <span v-if="item === 'gap'" class="sw-pager__gap" aria-hidden="true">&hellip;</span>
            <span v-else-if="item === page" class="sw-pager__num is-current" aria-current="page">{{ item }}</span>
            <RouterLink
              v-else
              :to="pageLink(item)"
              class="sw-pager__num"
              :aria-label="`${locale.t('watchList.page')} ${item}`"
              >{{ item }}</RouterLink
            >
          </li>
        </ol>

        <RouterLink
          v-if="page < pageCount"
          :to="pageLink(page + 1)"
          class="sw-pager__step"
          :aria-label="locale.t('watchList.nextPage')"
          rel="next"
        >
          {{ locale.t('watchList.nextPage') }} <span aria-hidden="true">&rarr;</span>
        </RouterLink>
        <span v-else class="sw-pager__step is-disabled" aria-hidden="true">
          {{ locale.t('watchList.nextPage') }} <span>&rarr;</span>
        </span>
      </nav>
    </template>

    <teleport to="body">
      <transition name="sw-fade">
        <div v-if="isFilterOpen" class="sw-filterdrawer-backdrop" @click.self="isFilterOpen = false">
          <aside
            class="sw-filterdrawer"
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            :aria-label="locale.t('watchList.filters')"
          >
            <div class="sw-filterdrawer__head">
              <span class="sw-eyebrow">{{ locale.t('watchList.filters') }}</span>
              <button class="sw-filterdrawer__close" type="button" @click="isFilterOpen = false">
                {{ locale.t('watchList.closeFilters') }}
              </button>
            </div>

            <div class="sw-filterdrawer__body">
              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterColor') }}</summary>
                <input
                  v-model="colorSearch"
                  type="text"
                  class="sw-filterdrawer__colorsearch"
                  :placeholder="locale.t('watchList.searchColors')"
                  :aria-label="locale.t('watchList.searchColors')"
                />
                <div class="sw-filterdrawer__colors">
                  <button
                    v-if="!colorSearch"
                    class="sw-filterdrawer__color"
                    :class="{ 'is-active': !selectedColor }"
                    type="button"
                    @click="selectedColor = ''"
                  >
                    <span class="sw-filterdrawer__swatch sw-filterdrawer__swatch--all" />
                    {{ locale.t('watchList.allColors') }}
                  </button>
                  <button
                    v-for="c in filteredColorOptions"
                    :key="c.colorSlug"
                    class="sw-filterdrawer__color"
                    :class="{ 'is-active': selectedColor === c.colorSlug }"
                    type="button"
                    @click="selectedColor = c.colorSlug"
                  >
                    <span class="sw-filterdrawer__swatch" :style="{ background: colorSwatchHex(c.colorSlug) }" />
                    {{ c.colorLabel }}
                    <span class="sw-filterdrawer__count">{{ colorCounts.get(c.colorSlug) ?? 0 }}</span>
                  </button>
                  <p v-if="colorSearch && filteredColorOptions.length === 0" class="sw-filterdrawer__colorempty">
                    {{ locale.t('watchList.noColorResults') }}
                  </p>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterGender') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': !selectedGender }"
                    type="button"
                    @click="selectedGender = ''"
                  >
                    {{ locale.t('watchList.allGenders') }}
                  </button>
                  <button
                    v-for="g in genderOptions"
                    :key="g"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedGender === g }"
                    type="button"
                    @click="selectedGender = g"
                  >
                    {{ locale.t(`watchList.gender_${g}`) }}
                  </button>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterCollection') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': !selectedCollection }"
                    type="button"
                    @click="selectedCollection = ''"
                  >
                    {{ locale.t('watchList.allCollections') }}
                  </button>
                  <button
                    v-for="c in collectionOptions"
                    :key="c._id"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedCollection === c._id }"
                    type="button"
                    @click="selectedCollection = c._id"
                  >
                    {{ c.name }}
                  </button>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterType') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    v-for="t in typeOptions"
                    :key="t"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedType === t }"
                    type="button"
                    @click="selectedType = t"
                  >
                    {{ typeLabel(t) }}
                  </button>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterPrice') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': !selectedPriceBand }"
                    type="button"
                    @click="selectedPriceBand = ''"
                  >
                    {{ locale.t('watchList.allPrices') }}
                  </button>
                  <button
                    v-for="key in priceBandOptions"
                    :key="key"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedPriceBand === key }"
                    type="button"
                    @click="selectedPriceBand = key"
                  >
                    {{ priceBandLabel(key) }}
                  </button>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterMovement') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': !selectedMovement }"
                    type="button"
                    @click="selectedMovement = ''"
                  >
                    {{ locale.t('watchList.allMovements') }}
                  </button>
                  <button
                    v-for="m in movementOptions"
                    :key="m"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedMovement === m }"
                    type="button"
                    @click="selectedMovement = m"
                  >
                    {{ m }}
                  </button>
                </div>
              </details>

              <details class="sw-filterdrawer__section" open>
                <summary class="sw-label">{{ locale.t('watchList.filterAvailability') }}</summary>
                <div class="sw-filterdrawer__list">
                  <button
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': !selectedAvailability }"
                    type="button"
                    @click="selectedAvailability = ''"
                  >
                    {{ locale.t('watchList.allAvailability') }}
                  </button>
                  <button
                    v-for="a in availabilityOptions"
                    :key="a"
                    class="sw-filterdrawer__option"
                    :class="{ 'is-active': selectedAvailability === a }"
                    type="button"
                    @click="selectedAvailability = a"
                  >
                    {{ availabilityLabel(a) }}
                  </button>
                </div>
              </details>
            </div>

            <div class="sw-filterdrawer__foot">
              <button v-if="hasActiveFilters" class="sw-filterdrawer__clear" type="button" @click="clearFilters">
                {{ locale.t('watchList.clearFilters') }}
              </button>
              <button class="sw-btn sw-btn--solid sw-filterdrawer__apply" type="button" @click="isFilterOpen = false">
                {{ locale.t('watchList.applyFilters') }} — {{ sortedWatches.length }}
              </button>
            </div>
          </aside>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
.sw-watchlist {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 120px;
}

.sw-watchlist__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.sw-watchlist__heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-watchlist__result-count {
  white-space: nowrap;
}

.sw-watchlist__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 28px;
  padding-bottom: 20px;
  margin-bottom: 40px;
  border-bottom: 1px solid var(--border);
}

.sw-watchlist__toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.sw-watchlist__toolbar-count {
  color: var(--text-muted);
}

.sw-watchlist__sort {
  position: relative;
}

.sw-watchlist__sort-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 8px 0;
  box-shadow: 0 12px 32px rgba(10, 10, 10, 0.08);
}

.sw-watchlist__sort-option {
  padding: 10px 18px;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.sw-watchlist__sort-option:hover,
.sw-watchlist__sort-option.is-active {
  color: var(--text);
  background: var(--surface-media);
}

.sw-watchlist__active {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: -16px;
  margin-bottom: 40px;
}

.sw-watchlist__chip {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: var(--text);
  padding: 6px 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sw-watchlist__chip span {
  color: var(--text-muted);
}

.sw-watchlist__clear-all {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.sw-watchlist__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(28px, 2.6vw, 48px) clamp(24px, 2.2vw, 40px);
}

.sw-watchlist__empty {
  padding: 60px 0;
}

/* ---- Pager ---- */
.sw-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Wide gaps between the three groups, so prev / numbers / next read as three
     targets rather than one run of text. */
  gap: clamp(20px, 4vw, 56px);
  margin-top: clamp(64px, 7vw, 104px);
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.sw-pager__step,
.sw-pager__num,
.sw-pager__gap {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease-luxury);
}

.sw-pager__step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.sw-pager__step:hover,
.sw-pager__num:hover {
  color: var(--text);
}

/* Kept in the flow rather than removed: the numbers stay put when the reader
   reaches the first or last page, instead of sliding sideways under the
   cursor. */
.sw-pager__step.is-disabled {
  opacity: 0.28;
  pointer-events: none;
}

.sw-pager__numbers {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sw-pager__num,
.sw-pager__gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Square and equal-width at every digit count, so a 9 → 10 → 11 walk does
     not reflow the row. */
  min-width: 40px;
  height: 40px;
  letter-spacing: 0.08em;
  border: 1px solid transparent;
}

.sw-pager__num.is-current {
  color: var(--text);
  border-color: currentColor;
}

.sw-pager__gap {
  min-width: 20px;
  letter-spacing: 0;
}

@media (max-width: 560px) {
  .sw-pager {
    /* Prev / Next sit under the numbers on a phone, where the row of digits
       already claims the full width. */
    flex-wrap: wrap;
    gap: 16px 24px;
  }

  .sw-pager__numbers {
    order: -1;
    width: 100%;
    justify-content: center;
  }

  .sw-pager__num,
  .sw-pager__gap {
    min-width: 34px;
    height: 34px;
  }
}

/* Tablet: two columns, more breathing room per card than the crowded 3-up
   tier this used to have — a luxury grid stays generous even mid-breakpoint. */
@media (max-width: 980px) {
  .sw-watchlist__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px 24px;
  }
}

@media (max-width: 780px) {
  .sw-watchlist__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .sw-watchlist__toolbar {
    justify-content: flex-start;
    gap: 24px;
  }
}

/* Narrow phones only — everything from tablet down to here stays 2-up. */
@media (max-width: 460px) {
  .sw-watchlist__grid {
    grid-template-columns: 1fr;
    gap: 36px;
  }
}

/* ---- Filter drawer ---- */
.sw-filterdrawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 10, 10, 0.5);
  display: flex;
  justify-content: flex-end;
}

.sw-filterdrawer {
  width: min(420px, 100vw);
  height: 100%;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  padding: 32px clamp(20px, 3vw, 36px) 0;
  overflow-y: auto;
}

.sw-filterdrawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.sw-filterdrawer__close {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sw-filterdrawer__body {
  flex: 1;
  padding: 8px 0 24px;
}

.sw-filterdrawer__section {
  border-bottom: 1px solid var(--hairline);
  padding: 20px 0;
}

.sw-filterdrawer__section summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
}

.sw-filterdrawer__section summary::-webkit-details-marker {
  display: none;
}

.sw-filterdrawer__section summary::after {
  content: '+';
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-muted);
  transition: transform var(--dur-fast) var(--ease-out);
}

.sw-filterdrawer__section[open] summary::after {
  content: '−';
}

.sw-filterdrawer__colorsearch {
  width: 100%;
  margin-top: 18px;
  padding: 8px 2px;
  border: none;
  border-bottom: 1px solid var(--hairline);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text);
}

.sw-filterdrawer__colorsearch::placeholder {
  color: var(--text-muted);
}

.sw-filterdrawer__colorsearch:focus {
  outline: none;
  border-bottom-color: var(--text);
}

.sw-filterdrawer__colors {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 16px;
  margin-top: 18px;
  max-height: 280px;
  overflow-y: auto;
}

.sw-filterdrawer__colorempty {
  grid-column: 1 / -1;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 4px 0;
}

.sw-filterdrawer__color {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: left;
  padding: 4px 0;
}

.sw-filterdrawer__color.is-active {
  color: var(--text);
  font-weight: 500;
}

.sw-filterdrawer__swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px var(--border) inset;
}

.sw-filterdrawer__swatch--all {
  background: conic-gradient(from 0deg, #1a1a1a, #b89652, #2f4a6b, #8c2b2b, #f2efe8, #1a1a1a);
}

.sw-filterdrawer__count {
  margin-left: auto;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
}

.sw-filterdrawer__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.sw-filterdrawer__option {
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.sw-filterdrawer__option.is-active {
  color: var(--text);
  font-weight: 500;
}

.sw-filterdrawer__foot {
  position: sticky;
  bottom: 0;
  background: var(--bg);
  padding: 20px 0 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--border);
}

.sw-filterdrawer__clear {
  align-self: center;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-decoration: underline;
}

.sw-filterdrawer__apply {
  width: 100%;
  justify-content: center;
}

@media (max-width: 560px) {
  .sw-filterdrawer-backdrop {
    align-items: flex-end;
  }

  .sw-filterdrawer {
    width: 100%;
    height: min(86vh, 720px);
    padding-top: 20px;
  }
}
</style>
