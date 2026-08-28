<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Brand } from '@/types/models';
import { adminFetchBrands, adminCreateBrand, adminUpdateBrand, adminDeleteBrand } from '@/services/brands';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import { resolveMediaUrl } from '@/utils/media';

const brands = ref<Brand[]>([]);
const isFormOpen = ref(false);
const editingId = ref<string | null>(null);

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
};
const form = ref({ ...emptyForm });

async function load() {
  brands.value = await adminFetchBrands();
}

function openCreate() {
  editingId.value = null;
  form.value = { ...emptyForm };
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
  };
  isFormOpen.value = true;
}

async function submit() {
  if (editingId.value) {
    await adminUpdateBrand(editingId.value, form.value);
  } else {
    await adminCreateBrand(form.value);
  }
  isFormOpen.value = false;
  await load();
}

async function remove(brand: Brand) {
  if (!confirm(`Delete "${brand.name}"?`)) return;
  await adminDeleteBrand(brand._id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="sw-admin-brands">
    <div class="sw-admin-brands__header">
      <h1 class="sw-admin-page-title">Brands</h1>
      <button class="sw-admin-btn" type="button" @click="openCreate">New Brand</button>
    </div>

    <div class="sw-admin-card sw-admin-brands__table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Country</th>
            <th>Featured</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="brand in brands" :key="brand._id">
            <td>{{ brand.name }}</td>
            <td>{{ brand.country }}</td>
            <td>{{ brand.featured ? 'Yes' : 'No' }}</td>
            <td>{{ brand.isActive ? 'Active' : 'Hidden' }}</td>
            <td class="sw-admin-brands__actions">
              <button type="button" @click="openEdit(brand)">Edit</button>
              <button type="button" @click="remove(brand)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="isFormOpen" class="sw-admin-modal-backdrop" @click.self="isFormOpen = false">
      <form class="sw-admin-card sw-admin-modal" @submit.prevent="submit">
        <h2 class="sw-admin-page-title">{{ editingId ? 'Edit Brand' : 'New Brand' }}</h2>
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          <span>Description</span>
          <textarea v-model="form.description" rows="3" />
        </label>
        <label>
          <span>Website</span>
          <input v-model="form.website" type="text" />
        </label>
        <label>
          <span>Country</span>
          <input v-model="form.country" type="text" />
        </label>
        <label>
          <span>Founded (year)</span>
          <input v-model.number="form.founded" type="number" />
        </label>

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
          <span class="sw-label">Logo</span>
          <img v-if="form.logo" :src="resolveMediaUrl(form.logo)" class="sw-admin-modal__preview" alt="" />
          <MediaUploader
            label="Upload Logo"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.logo = r.url)"
          />
        </div>

        <div>
          <span class="sw-label">Cover Image</span>
          <img v-if="form.image" :src="resolveMediaUrl(form.image)" class="sw-admin-modal__preview" alt="" />
          <MediaUploader
            label="Upload Cover"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => (form.image = r.url)"
          />
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
.sw-admin-brands__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sw-admin-brands__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.sw-admin-brands__actions {
  display: flex;
  gap: 14px;
}

.sw-admin-brands__actions button {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  text-decoration: underline;
}
</style>
