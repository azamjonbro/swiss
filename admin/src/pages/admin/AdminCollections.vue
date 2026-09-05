<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Collection, TranslationField, Translations, Watch } from '@/types/models';
import {
  adminFetchCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
} from '@/services/collections';
import { adminFetchWatches } from '@/services/watches';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import AdminModal from '@/components/admin/AdminModal.vue';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import { resolveMediaUrl } from '@/utils/media';
import { toBrandName } from '@/utils/format';

const locale = useLocaleStore();
const toasts = useToastStore();
const confirm = useConfirmStore();

const collections = ref<Collection[]>([]);
const allWatches = ref<Watch[]>([]);
const isLoading = ref(true);
const isFormOpen = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);
const watchQuery = ref('');

const translationFields = computed<TranslationField[]>(() => [
  { key: 'name', label: locale.t('admin.name') },
  { key: 'description', label: locale.t('admin.description'), type: 'textarea' },
]);

const emptyForm = {
  name: '',
  description: '',
  image: '',
  watches: [] as string[],
  featured: false,
  isActive: true,
  translations: {} as Translations,
};
const form = ref({ ...emptyForm });

// Picking watches used to be a native <select multiple>, which hides most of the
// list and needs ⌘-click to add a second entry. A filterable checkbox list shows
// what is selected without any modifier keys.
const filteredWatches = computed(() => {
  const q = watchQuery.value.trim().toLowerCase();
  if (!q) return allWatches.value;
  return allWatches.value.filter(
    (w) => w.name.toLowerCase().includes(q) || toBrandName(w.brand).toLowerCase().includes(q),
  );
});

async function load() {
  isLoading.value = true;
  try {
    const [collectionsData, watchesData] = await Promise.all([
      adminFetchCollections(),
      // Collections group timepieces, so the picker offers watches only —
      // accessories belong to a product through `compatibleWith`, not here.
      adminFetchWatches({ type: 'watch', limit: 100 }),
    ]);
    collections.value = collectionsData;
    allWatches.value = watchesData.items;
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function watchIdsOf(collection: Collection): string[] {
  return collection.watches.map((w) => (typeof w === 'string' ? w : w._id));
}

function openCreate() {
  editingId.value = null;
  watchQuery.value = '';
  form.value = { ...emptyForm, watches: [], translations: {} };
  isFormOpen.value = true;
}

function openEdit(collection: Collection) {
  editingId.value = collection._id;
  watchQuery.value = '';
  form.value = {
    name: collection.name,
    description: collection.description,
    image: collection.image,
    watches: watchIdsOf(collection),
    featured: collection.featured,
    isActive: collection.isActive,
    translations: {
      ru: { ...collection.translations?.ru },
      uz: { ...collection.translations?.uz },
    },
  };
  isFormOpen.value = true;
}

function toggleWatch(id: string) {
  const list = form.value.watches;
  form.value.watches = list.includes(id) ? list.filter((w) => w !== id) : [...list, id];
}

async function submit() {
  isSaving.value = true;
  try {
    const payload = form.value as unknown as Partial<Collection>;
    if (editingId.value) {
      await adminUpdateCollection(editingId.value, payload);
    } else {
      await adminCreateCollection(payload);
    }
    isFormOpen.value = false;
    toasts.success(locale.t('admin.collectionSaved'));
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}

async function remove(collection: Collection) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteCollectionTitle'),
    body: `“${collection.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteCollection(collection._id);
  toasts.success(locale.t('admin.collectionDeleted'));
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.collections') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.collectionsSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <button class="sw-admin-btn" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newCollection') }}
        </button>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-coll__loading">
        <div v-for="n in 3" :key="n" class="sw-admin-skeleton sw-coll__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!collections.length"
        icon="collection"
        :title="locale.t('admin.emptyCollections')"
        :body="locale.t('admin.emptyCollectionsBody')"
      >
        <button class="sw-admin-btn sw-admin-btn--sm" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newCollection') }}
        </button>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.colWatches') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="collection in collections" :key="collection._id">
              <td>
                <div class="sw-admin-cell-media">
                  <img v-if="collection.image" class="sw-admin-thumb" :src="resolveMediaUrl(collection.image)" alt="" />
                  <span v-else class="sw-admin-thumb sw-admin-thumb--empty">
                    <AdminIcon name="collection" :size="16" />
                  </span>
                  <div class="sw-admin-cell-title">{{ collection.name }}</div>
                </div>
              </td>
              <td>
                <span class="sw-admin-badge">{{ collection.watches.length }}</span>
              </td>
              <td>
                <div class="sw-coll__badges">
                  <span class="sw-admin-badge" :class="collection.isActive ? 'sw-admin-badge--success' : ''">
                    <span class="sw-admin-badge__dot" />
                    {{ collection.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                  </span>
                  <span v-if="collection.featured" class="sw-admin-badge sw-admin-badge--accent">
                    {{ locale.t('admin.featured') }}
                  </span>
                </div>
              </td>
              <td class="sw-admin-table__actions">
                <div>
                  <button
                    class="sw-admin-icon-btn"
                    type="button"
                    :aria-label="locale.t('admin.edit')"
                    @click="openEdit(collection)"
                  >
                    <AdminIcon name="edit" :size="15" />
                  </button>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(collection)"
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

    <AdminModal
      :open="isFormOpen"
      :title="editingId ? locale.t('admin.editCollection') : locale.t('admin.newCollection')"
      size="wide"
      @close="isFormOpen = false"
      @submit="submit"
    >
      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.name') }}</span>
          <input v-model="form.name" type="text" required />
        </label>
        <div class="sw-coll__media">
          <span class="sw-coll__media-label">{{ locale.t('admin.coverImage') }}</span>
          <div class="sw-coll__preview-wrap">
            <img v-if="form.image" :src="resolveMediaUrl(form.image)" class="sw-coll__preview" alt="" />
            <div v-else class="sw-coll__preview-empty"><AdminIcon name="image" :size="24" /></div>
          </div>
          <MediaUploader
            :label="locale.t('admin.uploadImage')"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.image = r.url)"
          />
        </div>
      </div>
      <label>
        <span>{{ locale.t('admin.description') }}</span>
        <textarea v-model="form.description" rows="3" />
      </label>

      <TranslationFields
        v-model="form.translations"
        :fields="translationFields"
        :base="{ name: form.name, description: form.description }"
      />

      <div class="sw-coll__picker">
        <div class="sw-coll__picker-head">
          <span class="sw-coll__picker-label">{{ locale.t('admin.colWatches') }}</span>
          <span class="sw-admin-badge sw-admin-badge--accent">{{ form.watches.length }}</span>
        </div>
        <div class="sw-admin-search">
          <span class="sw-admin-search__icon"><AdminIcon name="search" :size="15" /></span>
          <input v-model="watchQuery" type="search" :placeholder="locale.t('admin.searchWatches')" />
        </div>
        <div class="sw-coll__list">
          <label v-for="watch in filteredWatches" :key="watch._id" class="sw-coll__option">
            <input
              type="checkbox"
              :checked="form.watches.includes(watch._id)"
              @change="toggleWatch(watch._id)"
            />
            <span class="sw-coll__option-text">
              <span class="sw-coll__option-name">{{ watch.name }}</span>
              <span class="sw-coll__option-brand">{{ toBrandName(watch.brand) }}</span>
            </span>
          </label>
          <p v-if="!filteredWatches.length" class="sw-coll__list-empty">{{ locale.t('admin.noSearchResults') }}</p>
        </div>
      </div>

      <div class="sw-admin-grid sw-admin-grid--2">
        <label class="sw-admin-check sw-admin-check--boxed">
          <input v-model="form.featured" type="checkbox" />
          <span>{{ locale.t('admin.featured') }}</span>
        </label>
        <label class="sw-admin-check sw-admin-check--boxed">
          <input v-model="form.isActive" type="checkbox" />
          <span>{{ locale.t('admin.active') }}</span>
        </label>
      </div>



      <template #footer>
        <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="isFormOpen = false">
          {{ locale.t('admin.cancel') }}
        </button>
        <button class="sw-admin-btn" type="submit" :disabled="isSaving">
          {{ isSaving ? locale.t('admin.saving') : locale.t('admin.save') }}
        </button>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
.sw-coll__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sw-coll__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-coll__skeleton {
  height: 66px;
  border-radius: 0;
}

.sw-coll__picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-coll__picker-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sw-coll__picker-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--admin-text);
}

.sw-coll__list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
  background: var(--admin-surface-2);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-coll__option {
  flex-direction: row !important;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.sw-coll__option:hover {
  background: var(--admin-surface-3);
}

.sw-coll__option-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.sw-coll__option-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--admin-text);
}

.sw-coll__option-brand {
  font-size: 0.75rem;
  color: var(--admin-text-subtle);
}

.sw-coll__list-empty {
  padding: 18px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--admin-text-subtle);
}

.sw-coll__media {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-coll__media-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.sw-coll__preview-wrap {
  width: 100%;
  height: 160px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  overflow: hidden;
  background: var(--admin-surface-2);
}

.sw-coll__preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sw-coll__preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--admin-text-subtle);
}
</style>
