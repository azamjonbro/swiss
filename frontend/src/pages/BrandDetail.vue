<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Brand, Watch } from '@/types/models';
import { fetchBrandBySlug } from '@/services/brands';
import { fetchWatches } from '@/services/watches';
import { applyJsonLd, applySeo, site } from '@/utils/seo';
import type { CrumbItem } from '@/seo/schema.mjs';
import { brandSeo, breadcrumbSchema, itemListSchema, productPath, staticSeo, watchFullName } from '@/seo/schema.mjs';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import WatchCard from '@/components/watch/WatchCard.vue';
import Breadcrumbs from '@/components/shared/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();

const PAGE_SIZE = 24;

const brand = ref<Brand | null>(null);
const watches = ref<Watch[]>([]);
const total = ref(0);
const page = ref(1);
const isLoadingMore = ref(false);
const notFound = ref(false);

const hasMore = computed(() => watches.value.length < total.value);

const crumbs = computed<CrumbItem[]>(() =>
  brand.value
    ? [
        { name: locale.t('nav.home'), path: '/' },
        { name: locale.t('nav.brands'), path: '/brands' },
        { name: brand.value.name, path: `/brands/${brand.value.slug}` },
      ]
    : [],
);

/** Metadata for the maison, plus the trail and the list of pieces it holds. */
function applyBrandSeo() {
  if (!brand.value) return;
  applySeo({ ...brandSeo(brand.value, site), imageAlt: `${brand.value.name} watches` });
  applyJsonLd([
    breadcrumbSchema(crumbs.value, site),
    itemListSchema(
      watches.value.map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
      site,
      `${brand.value.name} watches`,
    ),
  ]);
}

async function load(slug: string) {
  notFound.value = false;
  page.value = 1;
  try {
    brand.value = await fetchBrandBySlug(slug);
    const data = await fetchWatches({ brand: brand.value._id, page: page.value, limit: PAGE_SIZE });
    watches.value = data.items;
    total.value = data.total;
    applyBrandSeo();
  } catch {
    notFound.value = true;
    const seo = staticSeo('not-found', site);
    if (seo) applySeo({ ...seo, canonical: route.path });
    applyJsonLd([]);
  }
}

async function loadMore() {
  if (!brand.value) return;
  isLoadingMore.value = true;
  try {
    page.value += 1;
    const data = await fetchWatches({ brand: brand.value._id, page: page.value, limit: PAGE_SIZE });
    watches.value = [...watches.value, ...data.items];
    total.value = data.total;
  } finally {
    isLoadingMore.value = false;
  }
}

onMounted(() => load(route.params.slug as string));
watch(
  () => route.params.slug,
  (slug) => slug && load(slug as string),
);
watch(
  () => locale.lang,
  () => load(route.params.slug as string),
);
</script>

<template>
  <div v-if="notFound" class="sw-brand-detail__notfound">
    <span class="sw-eyebrow">{{ locale.t('brandDetail.notFoundEyebrow') }}</span>
    <h1 class="sw-h1">{{ locale.t('brandDetail.notFoundTitle') }}</h1>
    <button class="sw-btn" type="button" @click="router.push('/brands')">{{ locale.t('brandDetail.backToBrands') }}</button>
  </div>

  <article v-else-if="brand" class="sw-brand-detail">
    <section class="sw-brand-detail__hero">
      <div class="sw-brand-detail__hero-media">
        <SmartImage :src="brand.image" :alt="`${brand.name} watches`" eager sizes="100vw" />
      </div>
      <div class="sw-brand-detail__hero-overlay" />
      <div class="sw-brand-detail__hero-content">
        <!-- Country and founding year are both optional Brand fields, and
             neither is invented when the record does not carry it: the eyebrow
             renders only the parts that exist, separator included. -->
        <span v-if="brand.country || brand.founded" class="sw-eyebrow"
          ><template v-if="brand.country">{{ brand.country }}</template
          ><template v-if="brand.country && brand.founded"> &middot; </template
          ><template v-if="brand.founded">{{ locale.t('brandDetail.est') }} {{ brand.founded }}</template
        ></span>
        <h1 class="sw-display">{{ brand.name }}</h1>
      </div>
    </section>

    <section class="sw-brand-detail__body">
      <Breadcrumbs class="sw-brand-detail__crumbs" :items="crumbs" />
      <p class="sw-body-lg">{{ brand.description }}</p>
    </section>

    <section v-if="watches.length" class="sw-brand-detail__watches">
      <span class="sw-eyebrow">{{ locale.t('brandDetail.availableTimepieces') }}</span>
      <div class="sw-brand-detail__grid">
        <WatchCard v-for="watch in watches" :key="watch._id" :watch="watch" />
      </div>

      <div v-if="hasMore" class="sw-brand-detail__more">
        <button class="sw-btn" type="button" :disabled="isLoadingMore" @click="loadMore">
          {{ isLoadingMore ? locale.t('watchList.loading') : locale.t('watchList.loadMore') }}
          <span v-if="!isLoadingMore" class="sw-btn__arrow" aria-hidden="true">&darr;</span>
        </button>
      </div>
    </section>
  </article>

  <!-- Pending. Without a placeholder the route rendered nothing at all, so a
       reader arriving on a maison page met an empty screen with the footer
       sitting at the fold — and then the whole page arriving underneath it. -->
  <div v-else class="sw-brand-detail sw-brand-detail--pending" aria-hidden="true">
    <div class="sw-brand-detail__hero">
      <div class="sw-brand-detail__hero-media sw-brand-detail__skel" />
    </div>
    <section class="sw-brand-detail__body sw-brand-detail__skel-body">
      <span class="sw-brand-detail__skel sw-brand-detail__skel-line" style="width: 82%" />
      <span class="sw-brand-detail__skel sw-brand-detail__skel-line" style="width: 94%" />
      <span class="sw-brand-detail__skel sw-brand-detail__skel-line" style="width: 46%" />
    </section>
    <section class="sw-brand-detail__watches">
      <span class="sw-brand-detail__skel sw-brand-detail__skel-eyebrow" />
      <div class="sw-brand-detail__grid">
        <div v-for="n in 6" :key="n" class="sw-brand-detail__skel sw-brand-detail__skel-card" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.sw-brand-detail__crumbs {
  margin-bottom: 20px;
}

/* The header is fixed, so a plate anchored at the top of the document slides
   straight under it. Every other interior page already offsets itself by the
   bar's height; this one did not. */
.sw-brand-detail {
  padding-top: var(--header-height);
}

.sw-brand-detail__hero {
  position: relative;
  color: var(--sw-white);
  /* Sized against the viewport rather than pinned to 21:9. That ratio resolved
     to about 160px of image on a phone — shorter than the header that covers
     its top edge — which is why the maison name was not visible there at all. */
  height: clamp(320px, 56svh, 620px);
  overflow: hidden;
}

.sw-brand-detail__hero-media {
  position: absolute;
  inset: 0;
}

.sw-brand-detail__hero-overlay {
  position: absolute;
  inset: 0;
  /* Maison "photography" is in practice the house logo on its own ground, and
     the name sits over it — so the foot of the scrim carries most of the
     weight, leaving the artwork legible above it. */
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.18) 0%, rgba(10, 10, 10, 0.42) 52%, rgba(10, 10, 10, 0.86) 100%);
}

.sw-brand-detail__hero-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 var(--container-pad) 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-brand-detail__body {
  max-width: 720px;
  padding: clamp(56px, 7vw, 96px) var(--container-pad) 0;
}

.sw-brand-detail__watches {
  padding: clamp(56px, 7vw, 96px) var(--container-pad) 120px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sw-brand-detail__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(24px, 3vw, 48px);
}

.sw-brand-detail__more {
  display: flex;
  justify-content: center;
  margin-top: clamp(24px, 3vw, 40px);
}

.sw-brand-detail__more .sw-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.sw-brand-detail__notfound {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
  padding: 0 var(--container-pad);
}

.sw-brand-detail__skel {
  background: linear-gradient(120deg, var(--surface-media) 0%, var(--surface-media-hi) 50%, var(--surface-media) 100%);
  background-size: 200% 100%;
  animation: sw-brand-skel 1.8s ease-in-out infinite;
}

.sw-brand-detail__skel-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-brand-detail__skel-line {
  display: block;
  height: 14px;
}

.sw-brand-detail__skel-eyebrow {
  display: block;
  width: 180px;
  height: 10px;
}

.sw-brand-detail__skel-card {
  aspect-ratio: 3 / 4;
}

@keyframes sw-brand-skel {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-brand-detail__skel {
    animation: none;
  }
}

@media (max-width: 900px) {
  .sw-brand-detail__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .sw-brand-detail__hero-content {
    padding-bottom: 36px;
  }
}

@media (max-width: 560px) {
  .sw-brand-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
