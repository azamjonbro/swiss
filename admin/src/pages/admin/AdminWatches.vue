<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Watch } from '@/types/models';
import { adminFetchWatches, adminDeleteWatch, adminUpdateWatch } from '@/services/watches';
import { adminFetchBrands } from '@/services/brands';
import { adminFetchCategories } from '@/services/categories';
import { toBrandName } from '@/utils/format';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import { resolveMediaUrl } from '@/utils/media';

const locale = useLocaleStore();
const toasts = useToastStore();
const confirm = useConfirmStore();

const watches = ref<Watch[]>([]);
const total = ref(0);
const search = ref('');
const activeQuery = ref('');
const isLoading = ref(true);

const brands = ref<any[]>([]);
const categories = ref<any[]>([]);
const filterBrand = ref('');
const filterCategory = ref('');

async function load() {
  isLoading.value = true;
  activeQuery.value = search.value.trim();
  try {
    const data = await adminFetchWatches({ 
      q: activeQuery.value || undefined,
      brand: filterBrand.value || undefined,
      category: filterCategory.value || undefined,
      limit: 50 
    });
    watches.value = data.items;
    total.value = data.total;
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function thumbOf(watch: Watch): string | null {
  const image = watch.variants?.[0]?.images?.[0];
  return image ? resolveMediaUrl(image) : null;
}

async function toggleFeatured(watch: Watch) {
  const updated = await adminUpdateWatch(watch._id, { featured: !watch.featured });
  watch.featured = updated.featured;
}

async function toggleActive(watch: Watch) {
  const updated = await adminUpdateWatch(watch._id, { isActive: !watch.isActive });
  watch.isActive = updated.isActive;
}

async function remove(watch: Watch) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteWatchTitle'),
    body: `“${watch.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteWatch(watch._id);
  toasts.success(locale.t('admin.watchDeleted'));
  await load();
}

onMounted(async () => {
  try {
    brands.value = await adminFetchBrands();
    categories.value = await adminFetchCategories();
  } catch {}
  load();
});
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.watches') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.watchesSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <RouterLink class="sw-admin-btn" to="/watches/new">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newWatch') }}
        </RouterLink>
      </div>
    </div>

    <form class="sw-admin-toolbar" @submit.prevent="load" style="flex-wrap: wrap; gap: 14px;">
      <div class="sw-admin-search">
        <span class="sw-admin-search__icon"><AdminIcon name="search" :size="15" /></span>
        <input v-model="search" type="search" :placeholder="locale.t('admin.searchWatches')" />
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <select v-model="filterBrand" @change="load" style="min-width: 140px; padding: 8px 12px; height: 38px;">
          <option value="">{{ locale.t('admin.allBrands') || 'All Brands' }}</option>
          <option v-for="b in brands" :key="b._id" :value="b._id">{{ b.name }}</option>
        </select>
        <select v-model="filterCategory" @change="load" style="min-width: 140px; padding: 8px 12px; height: 38px;">
          <option value="">{{ locale.t('admin.allCategories') || 'All Categories' }}</option>
          <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
        </select>
      </div>

      <button class="sw-admin-btn sw-admin-btn--ghost" type="submit" style="height: 38px;">{{ locale.t('admin.search') }}</button>
      
      <span v-if="!isLoading && watches.length" class="sw-watches__count" style="margin-left: auto;">
        {{ watches.length }} / {{ total }} {{ locale.t('admin.countShown') }}
      </span>
    </form>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-watches__loading">
        <div v-for="n in 6" :key="n" class="sw-admin-skeleton sw-watches__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!watches.length"
        icon="watch"
        :title="activeQuery ? locale.t('admin.noSearchResults') : locale.t('admin.emptyWatches')"
        :body="activeQuery ? locale.t('admin.noSearchResultsBody') : locale.t('admin.emptyWatchesBody')"
      >
        <RouterLink v-if="!activeQuery" class="sw-admin-btn sw-admin-btn--sm" to="/watches/new">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newWatch') }}
        </RouterLink>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.colBrand') }}</th>
              <th>{{ locale.t('admin.colPrice') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="watch in watches" :key="watch._id">
              <td>
                <div class="sw-admin-cell-media">
                  <img v-if="thumbOf(watch)" class="sw-admin-thumb" :src="thumbOf(watch)!" alt="" />
                  <span v-else class="sw-admin-thumb sw-admin-thumb--empty"><AdminIcon name="watch" :size="16" /></span>
                  <div>
                    <div class="sw-admin-cell-title">{{ watch.name }}</div>
                    <div v-if="watch.reference" class="sw-admin-cell-sub">{{ watch.reference }}</div>
                  </div>
                </div>
              </td>
              <td>{{ toBrandName(watch.brand) }}</td>
              <td class="sw-watches__price">{{ watch.price.toLocaleString() }} {{ watch.currency }}</td>
              <td>
                <div class="sw-watches__badges">
                  <button
                    class="sw-admin-badge sw-admin-toggle"
                    :class="watch.isActive ? 'sw-admin-badge--success' : ''"
                    type="button"
                    @click="toggleActive(watch)"
                  >
                    <span class="sw-admin-badge__dot" />
                    {{ watch.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                  </button>
                  <button
                    class="sw-admin-badge sw-admin-toggle"
                    :class="watch.featured ? 'sw-admin-badge--accent' : ''"
                    type="button"
                    @click="toggleFeatured(watch)"
                  >
                    <AdminIcon name="star" :size="12" />
                    {{ locale.t('admin.featured') }}
                  </button>
                </div>
              </td>
              <td class="sw-admin-table__actions">
                <div>
                  <RouterLink
                    class="sw-admin-icon-btn"
                    :to="`/watches/${watch._id}`"
                    :aria-label="locale.t('admin.edit')"
                  >
                    <AdminIcon name="edit" :size="15" />
                  </RouterLink>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(watch)"
                  >
                    <AdminIcon name="trash" :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-watches__count {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  font-variant-numeric: tabular-nums;
}

.sw-watches__price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sw-watches__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sw-watches__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-watches__skeleton {
  height: 66px;
  border-radius: 0;
}
</style>
