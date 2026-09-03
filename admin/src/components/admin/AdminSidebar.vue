<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import BrandMark from '@/components/shared/BrandMark.vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const locale = useLocaleStore();

const groups = computed(() => [
  {
    label: locale.t('admin.navOverview'),
    links: [
      { label: locale.t('admin.dashboard'), to: '/', icon: 'dashboard' },
      { label: locale.t('admin.analytics'), to: '/analytics', icon: 'analytics' },
    ],
  },
  {
    label: locale.t('admin.navCatalog'),
    links: [
      { label: locale.t('admin.watches'), to: '/watches', icon: 'watch' },
      { label: locale.t('admin.categories'), to: '/categories', icon: 'category' },
      { label: locale.t('admin.brands'), to: '/brands', icon: 'brand' },
      { label: locale.t('admin.collections'), to: '/collections', icon: 'collection' },
    ],
  },
  {
    label: locale.t('admin.navOperations'),
    links: [
      { label: locale.t('admin.customers'), to: '/customers', icon: 'customers' },
      { label: locale.t('admin.inquiries'), to: '/inquiries', icon: 'inquiry' },
      { label: locale.t('admin.media'), to: '/media', icon: 'media' },
      { label: locale.t('admin.settings'), to: '/settings', icon: 'settings' },
    ],
  },
]);
</script>

<template>
  <div class="sw-sidebar-scrim" :class="{ 'is-open': open }" @click="emit('close')" />

  <aside class="sw-sidebar" :class="{ 'is-open': open }">
    <RouterLink to="/" class="sw-sidebar__brand" aria-label="SwissWatch Admin" @click="emit('close')">
      <BrandMark :size="30" :sublabel="locale.t('admin.consoleLabel')" />
    </RouterLink>

    <nav class="sw-sidebar__nav">
      <div v-for="group in groups" :key="group.label" class="sw-sidebar__group">
        <p class="sw-sidebar__group-label">{{ group.label }}</p>
        <RouterLink
          v-for="link in group.links"
          :key="link.to"
          :to="link.to"
          class="sw-sidebar__link"
          exact-active-class="is-active"
          @click="emit('close')"
        >
          <AdminIcon :name="link.icon" :size="17" />
          <span>{{ link.label }}</span>
        </RouterLink>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sw-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  width: var(--admin-sidebar-w);
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
  padding: 18px 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  overflow-y: auto;
}

.sw-sidebar__brand {
  display: flex;
  padding: 6px 8px;
}

.sw-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sw-sidebar__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sw-sidebar__group-label {
  padding: 0 10px 7px;
  font-size: 0.67rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--admin-text-subtle);
}

.sw-sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--admin-text-muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-sidebar__link svg {
  flex: none;
  opacity: 0.8;
}

.sw-sidebar__link:hover {
  background: var(--admin-surface-3);
  color: var(--admin-text);
}

.sw-sidebar__link.is-active {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-weight: 600;
}

.sw-sidebar__link.is-active svg {
  opacity: 1;
}

/* The active marker rides the left gutter rather than filling the row, so the
   nav stays quiet while still being unmistakable. */
.sw-sidebar__link.is-active::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: var(--admin-accent);
}

.sw-sidebar-scrim {
  display: none;
}

@media (max-width: 960px) {
  .sw-sidebar {
    transform: translateX(-100%);
    transition: transform var(--dur-mid) var(--ease-luxury);
    box-shadow: var(--shadow-lg);
  }

  .sw-sidebar.is-open {
    transform: none;
  }

  .sw-sidebar-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 39;
    background: rgba(16, 15, 14, 0.45);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-mid) var(--ease-out);
  }

  .sw-sidebar-scrim.is-open {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
