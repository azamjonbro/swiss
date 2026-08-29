<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Brand, TranslationField, Translations } from '@/types/models';
import { adminFetchBrands, adminCreateBrand, adminUpdateBrand, adminDeleteBrand } from '@/services/brands';
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

const brands = ref<Brand[]>([]);
const isLoading = ref(true);
const isFormOpen = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);

const translationFields = computed<TranslationField[]>(() => [
  { key: 'name', label: locale.t('admin.name') },
  { key: 'description', label: locale.t('admin.description'), type: 'textarea' },
]);

const emptyForm = {
  name: '',
  description: '',
  logo: '',
  image: '',
  website: '',
  // Left blank on purpose: see the note on `country` in backend Brand model.
  country: '',
  founded: undefined as number | undefined,
  featured: false,
  isActive: true,
  translations: {} as Translations,
};
const form = ref({ ...emptyForm });

async function load() {
  isLoading.value = true;
  try {
    brands.value = await adminFetchBrands();
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

function openEdit(brand: Brand) {
  editingId.value = brand._id;
  form.value = {
    name: brand.name,
    description: brand.description,
    logo: brand.logo,
    image: brand.image,
    website: brand.website ?? '',
    country: brand.country ?? '',
    founded: brand.founded,
    featured: brand.featured,
    isActive: brand.isActive,
    translations: {
      ru: { ...brand.translations?.ru },
      uz: { ...brand.translations?.uz },
    },
  };
  isFormOpen.value = true;
}

async function submit() {
  isSaving.value = true;
  try {
    if (editingId.value) {
      await adminUpdateBrand(editingId.value, form.value);
    } else {
      await adminCreateBrand(form.value);
    }
    isFormOpen.value = false;
    toasts.success(locale.t('admin.brandSaved'));
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}

async function remove(brand: Brand) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteBrandTitle'),
    body: `“${brand.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteBrand(brand._id);
  toasts.success(locale.t('admin.brandDeleted'));
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.brands') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.brandsSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <button class="sw-admin-btn" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newBrand') }}
        </button>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-brands__loading">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-brands__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!brands.length"
        icon="brand"
        :title="locale.t('admin.emptyBrands')"
        :body="locale.t('admin.emptyBrandsBody')"
      >
        <button class="sw-admin-btn sw-admin-btn--sm" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newBrand') }}
        </button>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.country') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="brand in brands" :key="brand._id">
              <td>
                <div class="sw-admin-cell-media">
                  <img v-if="brand.logo" class="sw-admin-thumb" :src="resolveMediaUrl(brand.logo)" alt="" />
                  <span v-else class="sw-admin-thumb sw-admin-thumb--empty"><AdminIcon name="brand" :size="16" /></span>
                  <div>
                    <div class="sw-admin-cell-title">{{ brand.name }}</div>
                    <div v-if="brand.founded" class="sw-admin-cell-sub">Est. {{ brand.founded }}</div>
                  </div>
                </div>
              </td>
              <td>{{ brand.country || '—' }}</td>
              <td>
                <div class="sw-brands__badges">
                  <span class="sw-admin-badge" :class="brand.isActive ? 'sw-admin-badge--success' : ''">
                    <span class="sw-admin-badge__dot" />
                    {{ brand.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                  </span>
                  <span v-if="brand.featured" class="sw-admin-badge sw-admin-badge--accent">
                    {{ locale.t('admin.featured') }}
                  </span>
                </div>
              </td>
              <td class="sw-admin-table__actions">
                <div>
                  <button class="sw-admin-icon-btn" type="button" :aria-label="locale.t('admin.edit')" @click="openEdit(brand)">
                    <AdminIcon name="edit" :size="15" />
                  </button>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(brand)"
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
      :title="editingId ? locale.t('admin.editBrand') : locale.t('admin.newBrand')"
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
          <span>{{ locale.t('admin.website') }}</span>
          <input v-model="form.website" type="text" placeholder="https://" />
        </label>
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

      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.country') }}</span>
          <input v-model="form.country" type="text" />
        </label>
        <label>
          <span>{{ locale.t('admin.founded') }}</span>
          <input v-model.number="form.founded" type="number" />
        </label>
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

      <div class="sw-admin-grid sw-admin-grid--2">
        <div class="sw-brands__media">
          <span class="sw-brands__media-label">{{ locale.t('admin.logo') }}</span>
          <div class="sw-brands__preview-wrap">
            <img v-if="form.logo" :src="resolveMediaUrl(form.logo)" class="sw-brands__preview" alt="" />
            <div v-else class="sw-brands__preview-empty"><AdminIcon name="image" :size="24" /></div>
          </div>
          <MediaUploader
            :label="locale.t('admin.uploadImage')"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.logo = r.url)"
          />
        </div>
        <div class="sw-brands__media">
          <span class="sw-brands__media-label">{{ locale.t('admin.coverImage') }}</span>
          <div class="sw-brands__preview-wrap">
            <img v-if="form.image" :src="resolveMediaUrl(form.image)" class="sw-brands__preview" alt="" />
            <div v-else class="sw-brands__preview-empty"><AdminIcon name="image" :size="24" /></div>
          </div>
          <MediaUploader
            :label="locale.t('admin.uploadImage')"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.image = r.url)"
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
.sw-brands__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sw-brands__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-brands__skeleton {
  height: 66px;
  border-radius: 0;
}

.sw-brands__media {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-brands__media-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--admin-text-muted);
}

.sw-brands__preview-wrap {
  width: 100%;
  height: 160px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  overflow: hidden;
  background: var(--admin-surface-2);
}

.sw-brands__preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.sw-brands__preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--admin-text-subtle);
}
</style>
