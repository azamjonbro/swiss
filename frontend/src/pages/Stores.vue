<script setup lang="ts">
/**
 * The boutiques page.
 *
 * Only reachable while `src/data/locations.json` holds at least one entry —
 * the router does not register this route otherwise, so an empty file leaves
 * `/stores` 404ing like any other unknown path. Everything rendered here comes
 * from that file; nothing is filled in on its behalf.
 */
import { onMounted } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { storeLocations } from '@/data/locations';
import { applyJsonLd, site, storesJsonLd } from '@/utils/seo';
import { breadcrumbSchema, formatStoreAddress, itemListSchema, STORES_PATH, telHref } from '@/seo/schema.mjs';

const locale = useLocaleStore();

onMounted(() => {
  applyJsonLd([
    ...storesJsonLd(),
    breadcrumbSchema(
      [
        { name: 'Home', path: '/' },
        { name: 'Boutiques', path: STORES_PATH },
      ],
      site,
    ),
    itemListSchema(
      storeLocations.map((loc) => ({ name: loc.name, path: STORES_PATH })),
      site,
      'Boutiques',
    ),
  ]);
});
</script>

<template>
  <div class="sw-stores">
    <header class="sw-stores__header">
      <span class="sw-eyebrow">{{ locale.t('stores.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('stores.title') }}</h1>
      <p class="sw-body-lg">{{ locale.t('stores.intro') }}</p>
    </header>

    <ul class="sw-stores__list">
      <li v-for="store in storeLocations" :key="store.name" class="sw-stores__item">
        <h2 class="sw-h3">{{ store.name }}</h2>
        <p class="sw-body">{{ formatStoreAddress(store) }}</p>

        <div v-if="store.telephone" class="sw-stores__row">
          <span class="sw-eyebrow">{{ locale.t('stores.phone') }}</span>
          <a class="sw-body" :href="telHref(store.telephone)">{{ store.telephone }}</a>
        </div>

        <div v-if="store.openingHours.length" class="sw-stores__row">
          <span class="sw-eyebrow">{{ locale.t('stores.hours') }}</span>
          <p v-for="line in store.openingHours" :key="line" class="sw-body">{{ line }}</p>
        </div>

        <a
          v-if="store.mapUrl"
          class="sw-stores__map"
          :href="store.mapUrl"
          target="_blank"
          rel="noopener"
        >
          {{ locale.t('stores.directions') }}
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sw-stores {
  padding: 140px var(--container-pad) 120px;
}

.sw-stores__header {
  max-width: 720px;
  margin-bottom: 72px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sw-stores__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 48px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.sw-stores__item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.sw-stores__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sw-stores__map {
  margin-top: 8px;
  align-self: flex-start;
  border-bottom: 1px solid currentColor;
}
</style>
