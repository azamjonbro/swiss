<script setup lang="ts">
import { ref, computed, watch as watchRef, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { Watch } from '@/types/models';
import { adminFetchWatches, adminDeleteWatch, adminUpdateWatch, adminBulkDeleteWatches } from '@/services/watches';
import { adminFetchBrands } from '@/services/brands';
import { adminFetchCategories } from '@/services/categories';
import { localizedName } from '@/utils/format';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import { resolveMediaUrl } from '@/utils/media';

const route = useRoute();
const locale = useLocaleStore();

/**
 * Which slice of the catalogue this page is showing.
 *
 * Watches and accessories are the same records distinguished by `type`, and
 * they are managed as separate sections — so this one component serves both
 * routes and the route says which. Everything below that reads differently
 * between the two (the title, the empty state, the "new" link) keys off it.
 */
const productType = computed<'watch' | 'accessory'>(
  () => (route.meta.productType as 'watch' | 'accessory') ?? 'watch',
);
const isAccessory = computed(() => productType.value === 'accessory');

/** The form is shared too; the type rides in as a query parameter. */
const newProductLink = computed(() =>
  isAccessory.value ? '/watches/new?type=accessory' : '/watches/new',
);
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

/** The catalogue runs to a few hundred products; 50 a page keeps the table readable. */
const PAGE_SIZE = 50;
const page = ref(1);
const pages = ref(1);

/** Ids ticked on the current page. Cleared whenever the page or filter changes,
 *  because a selection the reader can no longer see is one they cannot revoke. */
const selected = ref<Set<string>>(new Set());
const isDeletingMany = ref(false);

const allOnPageSelected = computed(
  () => watches.value.length > 0 && watches.value.every((w) => selected.value.has(w._id)),
);

function toggleOne(id: string) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function toggleAllOnPage() {
  const next = new Set(selected.value);
  if (allOnPageSelected.value) watches.value.forEach((w) => next.delete(w._id));
  else watches.value.forEach((w) => next.add(w._id));
  selected.value = next;
}

async function removeSelected() {
  const ids = [...selected.value];
  if (!ids.length) return;

  const ok = await confirm.ask({
    title: locale.t('admin.deleteSelectedTitle'),
    body: `${ids.length} — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  isDeletingMany.value = true;
  try {
    const deleted = await adminBulkDeleteWatches(ids);
    selected.value = new Set();
    toasts.success(`${deleted} ${locale.t('admin.watchesDeleted')}`);
    // The page may no longer exist once the last rows on it are gone.
    if (page.value > 1 && watches.value.length === deleted) page.value -= 1;
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isDeletingMany.value = false;
  }
}

async function load() {
  isLoading.value = true;
  activeQuery.value = search.value.trim();
  try {
    const data = await adminFetchWatches({
      q: activeQuery.value || undefined,
      brand: filterBrand.value || undefined,
      category: filterCategory.value || undefined,
      type: productType.value,
      page: page.value,
      limit: PAGE_SIZE,
    });
    watches.value = data.items;
    total.value = data.total;
    pages.value = data.pages;
    // A filter that shrinks the result set can leave the reader on a page past
    // the end; step back to the last real one rather than showing nothing.
    if (page.value > data.pages && data.pages > 0) {
      page.value = data.pages;
      return load();
    }
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

/** Any change to what is being listed starts again from the first page. */
function reload() {
  page.value = 1;
  void load();
}

// Turning a page invalidates a selection the reader can no longer see.
watchRef(page, () => {
  selected.value = new Set();
  void load();
});

// Moving between Watches and Accessories reuses this component, so nothing of
// the previous section may carry over into the next one.
watchRef(productType, () => {
  search.value = '';
  filterBrand.value = '';
  filterCategory.value = '';
  selected.value = new Set();
  page.value = 1;
  void load();
});

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
        <h1 class="sw-admin-page-title">
          {{ isAccessory ? locale.t('admin.accessories') : locale.t('admin.watches') }}
        </h1>
        <p class="sw-admin-page-sub">
          {{ isAccessory ? locale.t('admin.accessoriesSub') : locale.t('admin.watchesSub') }}
        </p>
      </div>
      <div class="sw-admin-page-head__actions">
        <RouterLink class="sw-admin-btn" :to="newProductLink">
          <AdminIcon name="plus" :size="15" />
          {{ isAccessory ? locale.t('admin.newAccessory') : locale.t('admin.newWatch') }}
        </RouterLink>
      </div>
    </div>

    <form class="sw-admin-toolbar" @submit.prevent="reload" style="flex-wrap: wrap; gap: 14px;">
      <div class="sw-admin-search">
        <span class="sw-admin-search__icon"><AdminIcon name="search" :size="15" /></span>
        <input v-model="search" type="search" :placeholder="isAccessory ? locale.t('admin.searchAccessories') : locale.t('admin.searchWatches')" />
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <select v-model="filterBrand" class="sw-watches__filter" @change="reload">
          <option value="">{{ locale.t('admin.allBrands') }}</option>
          <option v-for="b in brands" :key="b._id" :value="b._id">{{ localizedName(b, locale.lang) }}</option>
        </select>
        <select v-model="filterCategory" class="sw-watches__filter" @change="reload">
          <option value="">{{ locale.t('admin.allCategories') }}</option>
          <option v-for="c in categories" :key="c._id" :value="c._id">{{ localizedName(c, locale.lang) }}</option>
        </select>
      </div>

      <button class="sw-admin-btn sw-admin-btn--ghost" type="submit" style="height: 38px;">{{ locale.t('admin.search') }}</button>
      
      <span v-if="!isLoading && watches.length" class="sw-watches__count" style="margin-left: auto;">
        {{ (page - 1) * PAGE_SIZE + 1 }}–{{ (page - 1) * PAGE_SIZE + watches.length }}
        / {{ total }} {{ locale.t('admin.countShown') }}
      </span>
    </form>

    <div v-if="selected.size" class="sw-watches__bulk">
      <span>{{ selected.size }} {{ locale.t('admin.selectedCount') }}</span>
      <button type="button" class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--quiet" @click="selected = new Set()">
        {{ locale.t('admin.clearSelection') }}
      </button>
      <button
        type="button"
        class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--danger"
        :disabled="isDeletingMany"
        @click="removeSelected"
      >
        <AdminIcon name="trash" :size="14" />
        {{ isDeletingMany ? locale.t('admin.saving') : locale.t('admin.deleteSelected') }}
      </button>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-watches__loading">
        <div v-for="n in 6" :key="n" class="sw-admin-skeleton sw-watches__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!watches.length"
        :icon="isAccessory ? 'accessory' : 'watch'"
        :title="
          activeQuery
            ? locale.t('admin.noSearchResults')
            : isAccessory
              ? locale.t('admin.emptyAccessories')
              : locale.t('admin.emptyWatches')
        "
        :body="activeQuery ? locale.t('admin.noSearchResultsBody') : locale.t('admin.emptyWatchesBody')"
      >
        <RouterLink v-if="!activeQuery" class="sw-admin-btn sw-admin-btn--sm" :to="newProductLink">
          <AdminIcon name="plus" :size="14" />
          {{ isAccessory ? locale.t('admin.newAccessory') : locale.t('admin.newWatch') }}
        </RouterLink>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th class="sw-watches__pick">
                <input
                  type="checkbox"
                  :checked="allOnPageSelected"
                  :aria-label="locale.t('admin.selectAll')"
                  @change="toggleAllOnPage"
                />
              </th>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.colBrand') }}</th>
              <th>{{ locale.t('admin.colPrice') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="watch in watches" :key="watch._id" :class="{ 'is-picked': selected.has(watch._id) }">
              <td class="sw-watches__pick">
                <input
                  type="checkbox"
                  :checked="selected.has(watch._id)"
                  :aria-label="watch.name"
                  @change="toggleOne(watch._id)"
                />
              </td>
              <td>
                <div class="sw-admin-cell-media">
                  <img v-if="thumbOf(watch)" class="sw-admin-thumb" :src="thumbOf(watch)!" alt="" />
                  <span v-else class="sw-admin-thumb sw-admin-thumb--empty">
                    <AdminIcon :name="isAccessory ? 'accessory' : 'watch'" :size="16" />
                  </span>
                  <div>
                    <div class="sw-admin-cell-title">{{ watch.name }}</div>
                    <div v-if="watch.reference" class="sw-admin-cell-sub">{{ watch.reference }}</div>
                  </div>
                </div>
              </td>
              <td>{{ localizedName(watch.brand, locale.lang) }}</td>
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

    <div v-if="pages > 1" class="sw-watches__pager">
      <button
        type="button"
        class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--ghost"
        :disabled="page <= 1 || isLoading"
        @click="page -= 1"
      >
        {{ locale.t('admin.prevPage') }}
      </button>
      <span class="sw-watches__pager-label">{{ page }} / {{ pages }}</span>
      <button
        type="button"
        class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--ghost"
        :disabled="page >= pages || isLoading"
        @click="page += 1"
      >
        {{ locale.t('admin.nextPage') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/**
 * Only the things that differ from a form select: this one is toolbar-sized.
 *
 * Everything else — surface, border, radius, focus ring and the chevron — comes
 * from the shared `select` rule. Re-declaring `background` here is what broke
 * it before: the shorthand resets `background-image`, so the chevron vanished
 * and the control was left with `appearance: none` and no arrow at all.
 *
 * The right padding has to keep clearing that chevron, which the shared rule
 * paints 10px wide, 16px in from the right edge.
 */
.sw-watches__filter {
  min-width: 150px;
  height: 38px;
  padding: 8px 40px 8px 12px;
  font-size: 0.85rem;
}

/* Sits between the toolbar and the table, so the count and the destructive
   action it applies to are read in that order. */
.sw-watches__bulk {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-2);
  font-size: 0.85rem;
  font-weight: 550;
}

.sw-watches__bulk button:last-child {
  margin-left: auto;
}

.sw-watches__pick {
  width: 42px;
  text-align: center;
}

.sw-watches__pick input {
  width: 15px;
  height: 15px;
  accent-color: var(--admin-accent);
  cursor: pointer;
}

.sw-admin-table tbody tr.is-picked {
  background: var(--admin-accent-soft);
}

.sw-watches__pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.sw-watches__pager-label {
  font-size: 0.82rem;
  color: var(--admin-text-muted);
  font-variant-numeric: tabular-nums;
}

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
