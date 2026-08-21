<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Watch } from '@/types/models';
import { adminFetchWatches, adminDeleteWatch, adminUpdateWatch } from '@/services/watches';
import { toBrandName } from '@/utils/format';

const watches = ref<Watch[]>([]);
const total = ref(0);
const search = ref('');
const isLoading = ref(true);

async function load() {
  isLoading.value = true;
  try {
    const data = await adminFetchWatches({ q: search.value || undefined, limit: 50 });
    watches.value = data.items;
    total.value = data.total;
  } finally {
    isLoading.value = false;
  }
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
  if (!confirm(`Delete "${watch.name}"? This cannot be undone.`)) return;
  await adminDeleteWatch(watch._id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="sw-admin-watches">
    <div class="sw-admin-watches__header">
      <h1 class="sw-admin-page-title">Watches</h1>
      <RouterLink class="sw-admin-btn" to="/watches/new">New Watch</RouterLink>
    </div>

    <div class="sw-admin-watches__toolbar">
      <input v-model="search" type="search" placeholder="Search by name or reference…" @keyup.enter="load" />
      <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="load">Search</button>
    </div>

    <div class="sw-admin-card sw-admin-watches__table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Brand</th>
            <th>Price</th>
            <th>Featured</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="watch in watches" :key="watch._id">
            <td>{{ watch.name }}</td>
            <td>{{ toBrandName(watch.brand) }}</td>
            <td>{{ watch.price.toLocaleString() }} {{ watch.currency }}</td>
            <td>
              <button class="sw-admin-toggle" :class="{ 'is-on': watch.featured }" type="button" @click="toggleFeatured(watch)">
                {{ watch.featured ? 'Yes' : 'No' }}
              </button>
            </td>
            <td>
              <button class="sw-admin-toggle" :class="{ 'is-on': watch.isActive }" type="button" @click="toggleActive(watch)">
                {{ watch.isActive ? 'Active' : 'Hidden' }}
              </button>
            </td>
            <td class="sw-admin-watches__actions">
              <RouterLink :to="`/watches/${watch._id}`">Edit</RouterLink>
              <button type="button" @click="remove(watch)">Delete</button>
            </td>
          </tr>
          <tr v-if="!isLoading && !watches.length">
            <td colspan="6">No watches found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sw-admin-watches__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sw-admin-page-title {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
}

.sw-admin-watches__toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  max-width: 420px;
}

.sw-admin-watches__toolbar input {
  flex: 1;
}

.sw-admin-watches__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.sw-admin-watches__actions {
  display: flex;
  gap: 14px;
}

.sw-admin-watches__actions a,
.sw-admin-watches__actions button {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  text-decoration: underline;
}

.sw-admin-toggle {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--admin-bg);
  color: var(--admin-text-muted);
}

.sw-admin-toggle.is-on {
  background: #e4ede5;
  color: #2f6b3f;
}
</style>
