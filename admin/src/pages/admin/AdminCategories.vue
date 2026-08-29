<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Category, TranslationField, Translations } from '@/types/models';
import {
  adminFetchCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminReorderCategories,
} from '@/services/categories';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import { resolveMediaUrl } from '@/utils/media';

const categories = ref<Category[]>([]);
const isFormOpen = ref(false);
const editingId = ref<string | null>(null);

const TRANSLATION_FIELDS: TranslationField[] = [
  { key: 'name', label: 'Name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

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
  categories.value = await adminFetchCategories();
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
  if (editingId.value) {
    await adminUpdateCategory(editingId.value, form.value);
  } else {
    await adminCreateCategory(form.value);
  }
  isFormOpen.value = false;
  await load();
}

async function remove(category: Category) {
  if (!confirm(`Delete "${category.name}"?`)) return;
  await adminDeleteCategory(category._id);
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
  <div class="sw-admin-categories">
    <div class="sw-admin-categories__header">
      <h1 class="sw-admin-page-title">Categories</h1>
      <button class="sw-admin-btn" type="button" @click="openCreate">New Category</button>
    </div>
    <p class="sw-admin-categories__hint">Order controls the homepage horizontal scroll sequence.</p>

    <div class="sw-admin-card sw-admin-categories__table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Name</th>
            <th>Featured</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(category, index) in categories" :key="category._id">
            <td class="sw-admin-categories__order">
              <button type="button" :disabled="index === 0" @click="move(index, -1)">&uarr;</button>
              <button type="button" :disabled="index === categories.length - 1" @click="move(index, 1)">&darr;</button>
            </td>
            <td>{{ category.name }}</td>
            <td>{{ category.featured ? 'Yes' : 'No' }}</td>
            <td>{{ category.isActive ? 'Active' : 'Hidden' }}</td>
            <td class="sw-admin-categories__actions">
              <button type="button" @click="openEdit(category)">Edit</button>
              <button type="button" @click="remove(category)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="isFormOpen" class="sw-admin-modal-backdrop" @click.self="isFormOpen = false">
      <form class="sw-admin-card sw-admin-modal" @submit.prevent="submit">
        <h2 class="sw-admin-page-title">{{ editingId ? 'Edit Category' : 'New Category' }}</h2>
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          <span>Tagline</span>
          <input v-model="form.tagline" type="text" />
        </label>
        <label>
          <span>Description</span>
          <textarea v-model="form.description" rows="3" />
        </label>

        <TranslationFields
          v-model="form.translations"
          :fields="TRANSLATION_FIELDS"
          :base="{ name: form.name, tagline: form.tagline, description: form.description }"
        />

        <div class="sw-admin-modal__check-row">
          <label class="sw-admin-modal__check">
            <input v-model="form.featured" type="checkbox" />
            <span>Featured</span>
          </label>
          <label class="sw-admin-modal__check">
            <input v-model="form.isActive" type="checkbox" />
            <span>Active</span>
          </label>
        </div>

        <div>
          <span class="sw-label">Image</span>
          <img v-if="form.image" :src="resolveMediaUrl(form.image)" class="sw-admin-modal__preview" alt="" />
          <MediaUploader
            label="Upload Image"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.image = r.url)"
          />
        </div>

        <div>
          <span class="sw-label">Video (optional)</span>
          <MediaUploader label="Upload Video" accept="video/mp4,video/webm" @uploaded="(r) => (form.video = r.url)" />
        </div>

        <div class="sw-admin-modal__actions">
          <button class="sw-admin-btn" type="submit">Save</button>
          <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="isFormOpen = false">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sw-admin-categories__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sw-admin-categories__hint {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  margin-bottom: 20px;
}

.sw-admin-categories__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.sw-admin-categories__order {
  display: flex;
  gap: 6px;
}

.sw-admin-categories__order button {
  width: 24px;
  height: 24px;
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
}

.sw-admin-categories__order button:disabled {
  opacity: 0.3;
}

.sw-admin-categories__actions {
  display: flex;
  gap: 14px;
}

.sw-admin-categories__actions button {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  text-decoration: underline;
}

.sw-admin-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(10, 10, 10, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sw-admin-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sw-admin-modal__check-row {
  display: flex;
  gap: 20px;
}

.sw-admin-modal__check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.sw-admin-modal__preview {
  width: 100%;
  max-height: 140px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: 8px;
}

.sw-admin-modal__actions {
  display: flex;
  gap: 12px;
}
</style>
