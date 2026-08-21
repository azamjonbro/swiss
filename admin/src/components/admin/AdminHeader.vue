<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import AdminPreferencesBar from '@/components/admin/AdminPreferencesBar.vue';

const router = useRouter();
const auth = useAuthStore();
const locale = useLocaleStore();

const storeUrl = import.meta.env.VITE_STORE_URL ?? 'http://localhost:5173';

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="sw-admin-header">
    <div>
      <p class="sw-admin-header__welcome">{{ locale.t('admin.welcomeBack') }}</p>
      <p class="sw-admin-header__name">{{ auth.admin?.name }}</p>
    </div>
    <div class="sw-admin-header__actions">
      <AdminPreferencesBar />
      <a :href="storeUrl" target="_blank" rel="noopener" class="sw-admin-btn sw-admin-btn--ghost">{{ locale.t('admin.viewSite') }}</a>
      <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="handleLogout">{{ locale.t('admin.logOut') }}</button>
    </div>
  </header>
</template>

<style scoped>
.sw-admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.sw-admin-header__welcome {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
}

.sw-admin-header__name {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 1.35rem;
  letter-spacing: -0.01em;
}

.sw-admin-header__actions {
  display: flex;
  gap: 12px;
}
</style>
