<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
import { useLocaleStore } from '@/stores/locale';
import { useAuthStore } from '@/stores/auth';
import StatCard from '@/components/admin/StatCard.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const locale = useLocaleStore();
const auth = useAuthStore();

interface DashboardStats {
  totalWatches: number;
  featuredWatches: number;
  totalCategories: number;
  totalBrands: number;
  newInquiries: number;
}

const stats = ref<DashboardStats | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get<DashboardStats>('/admin/dashboard');
    stats.value = data;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.welcomeBack') }} {{ auth.admin?.name }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.dashboardSub') }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="sw-dash__grid">
      <div v-for="n in 5" :key="n" class="sw-admin-skeleton sw-dash__skeleton" />
    </div>

    <div v-else-if="stats" class="sw-dash__grid">
      <StatCard :label="locale.t('admin.totalWatches')" :value="stats.totalWatches" icon="watch" to="/watches" />
      <StatCard :label="locale.t('admin.featuredWatches')" :value="stats.featuredWatches" icon="star" to="/watches" />
      <StatCard :label="locale.t('admin.categories')" :value="stats.totalCategories" icon="category" to="/categories" />
      <StatCard :label="locale.t('admin.brands')" :value="stats.totalBrands" icon="brand" to="/brands" />
      <StatCard
        :label="locale.t('admin.newInquiries')"
        :value="stats.newInquiries"
        icon="inquiry"
        to="/inquiries"
        :tone="stats.newInquiries > 0 ? 'accent' : 'default'"
      />
    </div>

    <section class="sw-dash__actions">
      <h2 class="sw-dash__actions-title">{{ locale.t('admin.quickActions') }}</h2>
      <div class="sw-dash__actions-row">
        <RouterLink class="sw-dash__action" to="/watches/new">
          <span class="sw-dash__action-icon"><AdminIcon name="plus" :size="16" /></span>
          {{ locale.t('admin.addWatch') }}
        </RouterLink>
        <RouterLink class="sw-dash__action" to="/categories">
          <span class="sw-dash__action-icon"><AdminIcon name="category" :size="16" /></span>
          {{ locale.t('admin.addCategory') }}
        </RouterLink>
        <RouterLink class="sw-dash__action" to="/inquiries">
          <span class="sw-dash__action-icon"><AdminIcon name="inquiry" :size="16" /></span>
          {{ locale.t('admin.reviewInquiries') }}
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sw-dash__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(184px, 1fr));
  gap: 16px;
}

.sw-dash__skeleton {
  height: 128px;
  border-radius: var(--radius-lg);
}

.sw-dash__actions {
  margin-top: 34px;
}

.sw-dash__actions-title {
  margin-bottom: 12px;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-dash__actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sw-dash__action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 15px;
  border-radius: var(--radius-md);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  box-shadow: var(--shadow-xs);
  font-size: 0.85rem;
  font-weight: 550;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

.sw-dash__action:hover {
  border-color: var(--admin-border-strong);
  box-shadow: var(--shadow-sm);
}

.sw-dash__action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}
</style>
