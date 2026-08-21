<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Watch, Category, Brand } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { fetchCategories } from '@/services/categories';
import { fetchBrands } from '@/services/brands';
import { useLocaleStore } from '@/stores/locale';
import WatchCard from '@/components/watch/WatchCard.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();

const watches = ref<Watch[]>([]);
const categories = ref<Category[]>([]);
const brands = ref<Brand[]>([]);
const total = ref(0);
const page = ref(1);
const isLoading = ref(true);

const categorySlug = computed(() => (route.query.category as string) ?? '');
const brandSlug = computed(() => (route.query.brand as string) ?? '');
const isNewOnly = computed(() => route.query.isNew === 'true');

async function load() {
  isLoading.value = true;
  try {
    const category = categories.value.find((c) => c.slug === categorySlug.value)?._id;
    const brand = brands.value.find((b) => b.slug === brandSlug.value)?._id;

    const data = await fetchWatches({
      category,
      brand,
      isNew: isNewOnly.value || undefined,
      page: page.value,
      limit: 12,
    });
    watches.value = data.items;
    total.value = data.total;
  } finally {
    isLoading.value = false;
  }
}

function setFilter(key: 'category' | 'brand', value: string) {
  page.value = 1;
  router.replace({ query: { ...route.query, [key]: value || undefined } });
}

function clearFilters() {
  page.value = 1;
  router.replace({ query: {} });
}

onMounted(async () => {
  const [categoriesData, brandsData] = await Promise.all([fetchCategories(), fetchBrands()]);
  categories.value = categoriesData;
  brands.value = brandsData;
  await load();
});

watch([categorySlug, brandSlug, isNewOnly], load);
</script>

<template>
  <div class="sw-watchlist">
    <header class="sw-watchlist__header">
      <span class="sw-eyebrow">{{ locale.t('watchList.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('watchList.title') }}</h1>
    </header>

    <div class="sw-watchlist__filters">
      <div class="sw-watchlist__filter-group">
        <button
          class="sw-watchlist__chip"
          :class="{ 'is-active': !categorySlug }"
          type="button"
          @click="setFilter('category', '')"
        >
          {{ locale.t('watchList.allHouses') }}
        </button>
        <button
          v-for="category in categories"
          :key="category._id"
          class="sw-watchlist__chip"
          :class="{ 'is-active': categorySlug === category.slug }"
          type="button"
          @click="setFilter('category', category.slug)"
        >
          {{ category.name }}
        </button>
      </div>

      <button v-if="categorySlug || brandSlug || isNewOnly" class="sw-watchlist__clear" type="button" @click="clearFilters">
        {{ locale.t('watchList.clearFilters') }}
      </button>
    </div>

    <p v-if="!isLoading && !watches.length" class="sw-body sw-watchlist__empty">
      {{ locale.t('watchList.empty') }}
    </p>

    <div v-else class="sw-watchlist__grid">
      <WatchCard v-for="watch in watches" :key="watch._id" :watch="watch" />
    </div>

    <p class="sw-watchlist__count sw-body">{{ total }} {{ locale.t('watchList.count') }}</p>
  </div>
</template>

<style scoped>
.sw-watchlist {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 120px;
}

.sw-watchlist__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 48px;
}

.sw-watchlist__filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 32px;
  margin-bottom: 48px;
  border-bottom: 1px solid var(--border);
}

.sw-watchlist__filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sw-watchlist__chip {
  padding: 10px 18px;
  border: 1px solid var(--border);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-watchlist__chip.is-active {
  background: var(--bg-inverse);
  color: var(--text-inverse);
  border-color: var(--bg-inverse);
}

.sw-watchlist__clear {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-decoration: underline;
}

.sw-watchlist__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(24px, 3vw, 48px);
}

.sw-watchlist__empty {
  padding: 60px 0;
}

.sw-watchlist__count {
  margin-top: 64px;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .sw-watchlist__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .sw-watchlist__grid {
    grid-template-columns: 1fr;
  }
}
</style>
