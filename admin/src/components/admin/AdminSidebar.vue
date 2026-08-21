<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();

const links = computed(() => [
  { label: locale.t('admin.dashboard'), to: '/' },
  { label: locale.t('admin.watches'), to: '/watches' },
  { label: locale.t('admin.categories'), to: '/categories' },
  { label: locale.t('admin.brands'), to: '/brands' },
  { label: locale.t('admin.collections'), to: '/collections' },
  { label: locale.t('admin.inquiries'), to: '/inquiries' },
  { label: locale.t('admin.media'), to: '/media' },
  { label: locale.t('admin.settings'), to: '/settings' },
]);
</script>

<template>
  <aside class="sw-admin-sidebar">
    <RouterLink to="/" class="sw-admin-sidebar__brand">SwissWatch<span>Admin</span></RouterLink>
    <nav class="sw-admin-sidebar__nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="sw-admin-sidebar__link"
        exact-active-class="is-active"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sw-admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--admin-sidebar-w);
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
}

.sw-admin-sidebar__brand {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  padding: 0 8px;
}

.sw-admin-sidebar__brand span {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-admin-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sw-admin-sidebar__link {
  padding: 10px 8px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--admin-text-muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-admin-sidebar__link:hover {
  background: var(--admin-bg);
  color: var(--admin-text);
}

.sw-admin-sidebar__link.is-active {
  background: var(--admin-accent);
  color: #fff;
}

@media (max-width: 900px) {
  .sw-admin-sidebar {
    position: static;
    width: 100%;
    height: auto;
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
  }

  .sw-admin-sidebar__nav {
    flex-direction: row;
  }
}
</style>
