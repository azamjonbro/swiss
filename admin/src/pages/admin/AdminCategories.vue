<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Category, TranslationField, Translations } from '@/types/models';
import {
  adminFetchCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminReorderCategories,
} from '@/services/categories';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import AdminModal from '@/components/admin/AdminModal.vue';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import { resolveMediaUrl } from '@/utils/media';

const locale = useLocaleStore();
const toasts = useToastStore();
const confirm = useConfirmStore();

const categories = ref<Category[]>([]);
const isLoading = ref(true);
const isFormOpen = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);

const translationFields = computed<TranslationField[]>(() => [
  { key: 'name', label: locale.t('admin.name') },
  { key: 'tagline', label: locale.t('admin.tagline') },
  { key: 'description', label: locale.t('admin.description'), type: 'textarea' },
]);

const emptyForm = {
  name: '',
  tagline: '',
  description: '',
  image: '',
  video: '',
  featured: false,
  isActive: true,
  translations: {} as Translations,
};
const form = ref({ ...emptyForm });

async function load() {
  isLoading.value = true;
  try {
    categories.value = await adminFetchCategories();
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = { ...emptyForm, translations: {} };
  isFormOpen.value = true;
}

function openEdit(category: Category) {
  editingId.value = category._id;
  form.value = {
    name: category.name,
    tagline: category.tagline,
    description: category.description,
    image: category.image,
    video: category.video ?? '',
    featured: category.featured,
    isActive: category.isActive,
    translations: {
      ru: { ...category.translations?.ru },
      uz: { ...category.translations?.uz },
    },
  };
  isFormOpen.value = true;
}

async function submit() {
  isSaving.value = true;
  try {
    if (editingId.value) {
      await adminUpdateCategory(editingId.value, form.value);
    } else {
      await adminCreateCategory(form.value);
    }
    isFormOpen.value = false;
    toasts.success(locale.t('admin.categorySaved'));
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}

async function remove(category: Category) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteCategoryTitle'),
    body: `“${category.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteCategory(category._id);
  toasts.success(locale.t('admin.categoryDeleted'));
  await load();
}

async function move(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= categories.value.length) return;
  const reordered = [...categories.value];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  categories.value = reordered;
  await adminReorderCategories(reordered.map((c) => c._id));
}

onMounted(load);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.categories') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.categoriesSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <button class="sw-admin-btn" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newCategory') }}
        </button>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-cat__loading">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-cat__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!categories.length"
        icon="category"
        :title="locale.t('admin.emptyCategories')"
        :body="locale.t('admin.emptyCategoriesBody')"
      >
        <button class="sw-admin-btn sw-admin-btn--sm" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newCategory') }}
        </button>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th class="sw-cat__order-col">{{ locale.t('admin.colOrder') }}</th>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(category, index) in categories" :key="category._id">
              <td>
                <div class="sw-cat__order">
                  <button
                    class="sw-admin-icon-btn"
                    type="button"
                    :aria-label="locale.t('admin.moveUp')"
                    :disabled="index === 0"
                    @click="move(index, -1)"
                  >
                    <AdminIcon name="arrowUp" :size="14" />
                  </button>
                  <button
                    class="sw-admin-icon-btn"
                    type="button"
                    :aria-label="locale.t('admin.moveDown')"
                    :disabled="index === categories.length - 1"
                    @click="move(index, 1)"
                  >
                    <AdminIcon name="arrowDown" :size="14" />
                  </button>
                </div>
              </td>
              <td>
                <div class="sw-admin-cell-media">
                  <img v-if="category.image" class="sw-admin-thumb" :src="resolveMediaUrl(category.image)" alt="" />
                  <span v-else class="sw-admin-thumb sw-admin-thumb--empty"><AdminIcon name="image" :size="16" /></span>
                  <div>
                    <div class="sw-admin-cell-title">{{ category.name }}</div>
                    <div v-if="category.tagline" class="sw-admin-cell-sub">{{ category.tagline }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sw-cat__badges">
                  <span class="sw-admin-badge" :class="category.isActive ? 'sw-admin-badge--success' : ''">
                    <span class="sw-admin-badge__dot" />
                    {{ category.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                  </span>
                  <span v-if="category.featured" class="sw-admin-badge sw-admin-badge--accent">
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
                    @click="openEdit(category)"
                  >
                    <AdminIcon name="edit" :size="15" />
                  </button>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(category)"
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
      :title="editingId ? locale.t('admin.editCategory') : locale.t('admin.newCategory')"
      size="wide"
      @close="isFormOpen = false"
      @submit="submit"
    >
      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.name') }}</span>
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          <span>{{ locale.t('admin.tagline') }}</span>
          <input v-model="form.tagline" type="text" />
        </label>
      </div>
      <label>
        <span>{{ locale.t('admin.description') }}</span>
        <textarea v-model="form.description" rows="3" />
      </label>

      <TranslationFields
        v-model="form.translations"
        :fields="translationFields"
        :base="{ name: form.name, tagline: form.tagline, description: form.description }"
      />

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

      <div class="sw-admin-grid sw-admin-grid--2">
        <div class="sw-cat__media">
          <span class="sw-admin-media-label">{{ locale.t('admin.image') }}</span>
          <div class="sw-cat__preview-wrap">
            <img v-if="form.image" :src="resolveMediaUrl(form.image)" class="sw-cat__preview" alt="" />
            <div v-else class="sw-cat__preview-empty"><AdminIcon name="image" :size="24" /></div>
          </div>
          <MediaUploader
            :label="locale.t('admin.uploadImage')"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.image = r.url)"
          />
        </div>
        <div class="sw-cat__media">
          <span class="sw-admin-media-label">{{ locale.t('admin.video') }} ({{ locale.t('admin.optional') }})</span>
          <div class="sw-cat__preview-wrap">
            <video v-if="form.video" :src="resolveMediaUrl(form.video)" class="sw-cat__preview" muted />
            <div v-else class="sw-cat__preview-empty"><AdminIcon name="play" :size="24" /></div>
          </div>
          <MediaUploader
            :label="locale.t('admin.uploadVideo')"
            accept="video/mp4,video/webm"
            @uploaded="(r) => (form.video = r.url)"
          />
        </div>
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
.sw-cat__order-col {
  width: 1%;
}

.sw-cat__order {
  display: flex;
  gap: 4px;
}

.sw-cat__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sw-cat__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-cat__skeleton {
  height: 66px;
  border-radius: 0;
}

.sw-cat__media {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-admin-media-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.sw-cat__preview-wrap {
  width: 100%;
  height: 160px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  overflow: hidden;
  background: var(--admin-surface-2);
}

.sw-cat__preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sw-cat__preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--admin-text-subtle);
}
</style>
