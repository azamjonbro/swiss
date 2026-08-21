<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
import { useLocaleStore } from '@/stores/locale';
import StatCard from '@/components/admin/StatCard.vue';

const locale = useLocaleStore();

interface DashboardStats {
  totalWatches: number;
  featuredWatches: number;
  totalCategories: number;
  totalBrands: number;
  newInquiries: number;
}

const stats = ref<DashboardStats | null>(null);

onMounted(async () => {
  const { data } = await api.get<DashboardStats>('/admin/dashboard');
  stats.value = data;
});
</script>

<template>
  <div class="sw-admin-dashboard">
    <h1 class="sw-admin-dashboard__title">{{ locale.t('admin.dashboardTitle') }}</h1>

    <div v-if="stats" class="sw-admin-dashboard__grid">
      <StatCard :label="locale.t('admin.totalWatches')" :value="stats.totalWatches" />
      <StatCard :label="locale.t('admin.featuredWatches')" :value="stats.featuredWatches" />
      <StatCard :label="locale.t('admin.categories')" :value="stats.totalCategories" />
      <StatCard :label="locale.t('admin.brands')" :value="stats.totalBrands" />
      <StatCard :label="locale.t('admin.newInquiries')" :value="stats.newInquiries" />
    </div>
  </div>
</template>

<style scoped>
.sw-admin-dashboard__title {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}

.sw-admin-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}
</style>
