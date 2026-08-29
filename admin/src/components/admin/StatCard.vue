<script setup lang="ts">
import AdminIcon from '@/components/shared/AdminIcon.vue';

withDefaults(
  defineProps<{
    label: string;
    value: number | string;
    icon?: string;
    to?: string;
    tone?: 'default' | 'accent';
  }>(),
  { icon: 'dashboard', tone: 'default' },
);
</script>

<template>
  <component :is="to ? 'RouterLink' : 'div'" :to="to" class="sw-stat" :class="[`is-${tone}`, { 'is-link': to }]">
    <span class="sw-stat__icon"><AdminIcon :name="icon" :size="17" /></span>
    <span class="sw-stat__value">{{ value }}</span>
    <span class="sw-stat__label">{{ label }}</span>
  </component>
</template>

<style scoped>
.sw-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.sw-stat.is-link:hover {
  border-color: var(--admin-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.sw-stat__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 10px;
  border-radius: var(--radius-sm);
  background: var(--admin-surface-3);
  color: var(--admin-text-muted);
}

.sw-stat.is-accent .sw-stat__icon {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.sw-stat__value {
  font-size: 1.85rem;
  font-weight: 680;
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.sw-stat__label {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
}
</style>
