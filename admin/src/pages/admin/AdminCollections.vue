<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Collection, Watch } from '@/types/models';
import {
  adminFetchCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
} from '@/services/collections';
import { adminFetchWatches } from '@/services/watches';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import { resolveMediaUrl } from '@/utils/media';

const collections = ref<Collection[]>([]);
const allWatches = ref<Watch[]>([]);
const isFormOpen = ref(false);
const editingId = ref<string | null>(null);

const emptyForm = { name: '', description: '', image: '', watches: [] as string[], featured: false, isActive: true };
const form = ref({ ...emptyForm });

async function load() {
  const [collectionsData, watchesData] = await Promise.all([adminFetchCollections(), adminFetchWatches({ limit: 100 })]);
  collections.value = collectionsData;
  allWatches.value = watchesData.items;
}

function watchIdsOf(collection: Collection): string[] {
  return collection.watches.map((w) => (typeof w === 'string' ? w : w._id));
}

function openCreate() {
  editingId.value = null;
  form.value = { ...emptyForm };
  isFormOpen.value = true;
}

function openEdit(collection: Collection) {
  editingId.value = collection._id;
  form.value = {
    name: collection.name,
    description: collection.description,
    image: collection.image,
    watches: watchIdsOf(collection),
    featured: collection.featured,
    isActive: collection.isActive,
  };
  isFormOpen.value = true;
}

async function submit() {
  if (editingId.value) {
    await adminUpdateCollection(editingId.value, form.value as unknown as Partial<Collection>);
  } else {
    await adminCreateCollection(form.value as unknown as Partial<Collection>);
  }
  isFormOpen.value = false;
  await load();
}

async function remove(collection: Collection) {
  if (!confirm(`Delete "${collection.name}"?`)) return;
  await adminDeleteCollection(collection._id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="sw-admin-collections">
    <div class="sw-admin-collections__header">
      <h1 class="sw-admin-page-title">Collections</h1>
      <button class="sw-admin-btn" type="button" @click="openCreate">New Collection</button>
    </div>

    <div class="sw-admin-card sw-admin-collections__table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Watches</th>
            <th>Featured</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="collection in collections" :key="collection._id">
            <td>{{ collection.name }}</td>
            <td>{{ collection.watches.length }}</td>
            <td>{{ collection.featured ? 'Yes' : 'No' }}</td>
            <td>{{ collection.isActive ? 'Active' : 'Hidden' }}</td>
            <td class="sw-admin-collections__actions">
              <button type="button" @click="openEdit(collection)">Edit</button>
              <button type="button" @click="remove(collection)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="isFormOpen" class="sw-admin-modal-backdrop" @click.self="isFormOpen = false">
      <form class="sw-admin-card sw-admin-modal" @submit.prevent="submit">
        <h2 class="sw-admin-page-title">{{ editingId ? 'Edit Collection' : 'New Collection' }}</h2>
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          <span>Description</span>
          <textarea v-model="form.description" rows="3" />
        </label>

        <label>
          <span>Watches</span>
          <select v-model="form.watches" multiple class="sw-admin-collections__select">
            <option v-for="watch in allWatches" :key="watch._id" :value="watch._id">{{ watch.name }}</option>
          </select>
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
.sw-admin-collections__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sw-admin-collections__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.sw-admin-collections__actions {
  display: flex;
  gap: 14px;
}

.sw-admin-collections__actions button {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  text-decoration: underline;
}

.sw-admin-collections__select {
  min-height: 120px;
}
</style>
