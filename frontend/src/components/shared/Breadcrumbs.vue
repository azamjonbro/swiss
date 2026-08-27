<script setup lang="ts">
/**
 * The visible breadcrumb trail. Takes the same `{ name, path }` items that
 * feed `breadcrumbSchema`, so what a reader sees and what a crawler parses are
 * built from one array — they cannot drift apart.
 */
import type { CrumbItem } from '@/seo/schema.mjs';

defineProps<{ items: CrumbItem[] }>();
</script>

<template>
  <nav class="sw-crumbs" aria-label="Breadcrumb">
    <template v-for="(item, i) in items" :key="item.path">
      <RouterLink v-if="i < items.length - 1" :to="item.path">{{ item.name }}</RouterLink>
      <span v-else aria-current="page">{{ item.name }}</span>
      <span v-if="i < items.length - 1" aria-hidden="true">/</span>
    </template>
  </nav>
</template>

<style scoped>
.sw-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-crumbs a {
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-crumbs a:hover {
  color: var(--text);
}

@media (max-width: 640px) {
  .sw-crumbs {
    font-size: 0.72rem;
  }
}
</style>
