<script setup lang="ts">
/**
 * The visible breadcrumb trail. Takes the same `{ name, path }` items that
 * feed `breadcrumbSchema`, so what a reader sees and what a crawler parses are
 * built from one array — they cannot drift apart.
 *
 * On a phone the trail is replaced by a single "back" control: three or four
 * tracked-caps links wrapped onto two lines were the first thing on the
 * screen, and a visitor who has just tapped a card wants the grid they left,
 * scrolled where they left it — which only history can give back. The trail
 * stays in the DOM (hidden) so the markup a crawler reads is the same at
 * every width.
 */
import { useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import type { CrumbItem } from '@/seo/schema.mjs';

const props = defineProps<{ items: CrumbItem[] }>();
const router = useRouter();
const locale = useLocaleStore();

function goBack() {
  // vue-router records the previous in-app location on the history entry;
  // without one (a shared link, a fresh tab) there is nothing to go back to,
  // so the parent crumb is the next best place.
  const cameFromApp = Boolean((window.history.state as { back?: string } | null)?.back);
  if (cameFromApp) {
    router.back();
    return;
  }
  const parent = props.items[props.items.length - 2];
  router.push(parent?.path ?? '/');
}
</script>

<template>
  <nav class="sw-crumbs" aria-label="Breadcrumb">
    <button class="sw-crumbs__back" type="button" @click="goBack">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15.5 5.5 9 12l6.5 6.5" />
      </svg>
      <span>{{ locale.t('common.back') }}</span>
    </button>
    <div class="sw-crumbs__trail">
      <template v-for="(item, i) in items" :key="item.path">
        <RouterLink v-if="i < items.length - 1" :to="item.path">{{ item.name }}</RouterLink>
        <span v-else aria-current="page">{{ item.name }}</span>
        <span v-if="i < items.length - 1" aria-hidden="true">/</span>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.sw-crumbs__trail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-crumbs__trail a {
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-crumbs__trail a:hover {
  color: var(--text);
}

.sw-crumbs__back {
  display: none;
}

@media (max-width: 640px) {
  .sw-crumbs__trail {
    display: none;
  }

  /* Pulled 12px left so the chevron's stroke, not the button's padding, sits
     on the gutter line with the copy below it. */
  .sw-crumbs__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: -12px;
    padding: 10px 14px 10px 10px;
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text);
  }

  .sw-crumbs__back svg {
    width: 20px;
    height: 20px;
  }
}
</style>
