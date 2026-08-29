<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import AdminPreferencesBar from '@/components/admin/AdminPreferencesBar.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const emit = defineEmits<{ 'toggle-nav': [] }>();

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const locale = useLocaleStore();

const storeUrl = import.meta.env.VITE_STORE_URL ?? 'http://localhost:5173';

// The page title lives in the route meta so the header names the current screen
// instead of repeating the admin's own name on every page.
const pageTitle = computed(() => {
  const key = route.meta.titleKey as string | undefined;
  return key ? locale.t(key) : '';
});

const initials = computed(() =>
  (auth.admin?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join(''),
);

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="sw-header">
    <button class="sw-admin-icon-btn sw-header__burger" type="button" aria-label="Menu" @click="emit('toggle-nav')">
      <AdminIcon name="menu" :size="18" />
    </button>

    <p class="sw-header__title">{{ pageTitle }}</p>

    <div class="sw-header__actions">
      <AdminPreferencesBar />
      <span class="sw-header__divider" />
      <a
        :href="storeUrl"
        target="_blank"
        rel="noopener"
        class="sw-admin-icon-btn"
        :title="locale.t('admin.viewSite')"
        :aria-label="locale.t('admin.viewSite')"
      >
        <AdminIcon name="external" :size="16" />
      </a>
      <button
        class="sw-admin-icon-btn"
        type="button"
        :title="locale.t('admin.logOut')"
        :aria-label="locale.t('admin.logOut')"
        @click="handleLogout"
      >
        <AdminIcon name="logout" :size="16" />
      </button>
      <div class="sw-header__user" :title="auth.admin?.email">
        <span class="sw-header__avatar">{{ initials }}</span>
        <span class="sw-header__name">{{ auth.admin?.name }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.sw-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--admin-header-h);
  padding: 0 clamp(16px, 3vw, 34px);
  background: color-mix(in srgb, var(--admin-bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--admin-border);
}

.sw-header__burger {
  display: none;
}

.sw-header__title {
  font-size: 0.95rem;
  font-weight: 620;
  letter-spacing: -0.01em;
}

.sw-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.sw-header__divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--admin-border);
}

.sw-header__user {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: 6px;
  padding-left: 12px;
  border-left: 1px solid var(--admin-border);
}

.sw-header__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: var(--radius-full);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.sw-header__name {
  font-size: 0.85rem;
  font-weight: 550;
}

@media (max-width: 960px) {
  .sw-header__burger {
    display: inline-flex;
  }
}

@media (max-width: 720px) {
  .sw-header__name,
  .sw-header__divider {
    display: none;
  }

  .sw-header__user {
    padding-left: 8px;
    margin-left: 2px;
  }
}
</style>
