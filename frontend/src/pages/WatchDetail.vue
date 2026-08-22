<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Watch } from '@/types/models';
import { fetchWatchBySlug } from '@/services/watches';
import { toBrandName, toBrandSlug } from '@/utils/format';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { useMeta } from '@/composables/useMeta';
import SmartImage from '@/components/shared/SmartImage.vue';

const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const locale = useLocaleStore();
const currency = useCurrencyStore();

const watchDoc = ref<Watch | null>(null);
const activeIndex = ref(0);
const isFullscreen = ref(false);
const isLoading = ref(true);
const notFound = ref(false);

const brandName = computed(() => (watchDoc.value ? toBrandName(watchDoc.value.brand) : ''));
const brandSlug = computed(() => (watchDoc.value ? toBrandSlug(watchDoc.value.brand) : ''));

const specs = computed(() => {
  if (!watchDoc.value) return [];
  const w = watchDoc.value;
  return [
    { label: locale.t('watchDetail.reference'), value: w.reference },
    { label: locale.t('watchDetail.movement'), value: w.movement },
    { label: locale.t('watchDetail.case'), value: `${w.caseMaterial}, ${w.caseSize}` },
    { label: locale.t('watchDetail.dial'), value: w.dial },
    { label: locale.t('watchDetail.bracelet'), value: w.bracelet },
    { label: locale.t('watchDetail.waterResistance'), value: w.waterResistance },
  ].filter((s) => s.value);
});

const availabilityLabel = computed(() => {
  const map: Record<string, string> = {
    'in-stock': locale.t('watchDetail.available'),
    reserved: locale.t('watchDetail.reserved'),
    sold: locale.t('watchDetail.sold'),
    'made-to-order': locale.t('watchDetail.madeToOrder'),
  };
  return watchDoc.value ? map[watchDoc.value.availability] ?? watchDoc.value.availability : '';
});

async function load(slug: string) {
  isLoading.value = true;
  notFound.value = false;
  activeIndex.value = 0;
  try {
    watchDoc.value = await fetchWatchBySlug(slug);
    useMeta(
      `${toBrandName(watchDoc.value.brand)} ${watchDoc.value.name} — SwissWatch`,
      watchDoc.value.shortDescription || watchDoc.value.description,
    );
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => load(route.params.slug as string));
watch(
  () => route.params.slug,
  (slug) => {
    if (slug) load(slug as string);
  },
);

function openInquiry() {
  if (!watchDoc.value) return;
  ui.openInquiry({ id: watchDoc.value._id, name: `${brandName.value} ${watchDoc.value.name}` });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isFullscreen.value = false;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="sw-watch-detail-page">
  <div v-if="notFound" class="sw-watch-detail__notfound">
    <span class="sw-eyebrow">{{ locale.t('watchDetail.notFoundEyebrow') }}</span>
    <h1 class="sw-h1">{{ locale.t('watchDetail.notFoundTitle') }}</h1>
    <button class="sw-btn" type="button" @click="router.push('/watches')">{{ locale.t('watchDetail.backToCollection') }}</button>
  </div>

  <article v-else-if="watchDoc" class="sw-watch-detail">
    <div class="sw-watch-detail__gallery">
      <div class="sw-watch-detail__main" @click="isFullscreen = true">
        <SmartImage :src="watchDoc.images[activeIndex]" :alt="watchDoc.name" eager aspect-ratio="4 / 5" />
      </div>
      <div v-if="watchDoc.images.length > 1" class="sw-watch-detail__thumbs">
        <button
          v-for="(img, i) in watchDoc.images"
          :key="img + i"
          class="sw-watch-detail__thumb"
          :class="{ 'is-active': i === activeIndex }"
          type="button"
          @click="activeIndex = i"
        >
          <SmartImage :src="img" :alt="`${watchDoc.name} view ${i + 1}`" aspect-ratio="1 / 1" />
        </button>
      </div>
    </div>

    <div class="sw-watch-detail__info">
      <RouterLink v-if="brandSlug" :to="`/brands/${brandSlug}`" class="sw-label sw-watch-detail__brand">
        {{ brandName }}
      </RouterLink>
      <h1 class="sw-h1">{{ watchDoc.name }}</h1>
      <p class="sw-watch-detail__price">{{ currency.format(watchDoc.price) }}</p>
      <p class="sw-body-lg sw-watch-detail__desc">{{ watchDoc.description }}</p>

      <dl class="sw-watch-detail__specs">
        <div v-for="spec in specs" :key="spec.label" class="sw-watch-detail__spec">
          <dt class="sw-label">{{ spec.label }}</dt>
          <dd class="sw-body">{{ spec.value }}</dd>
        </div>
      </dl>

      <div class="sw-watch-detail__availability">
        <span class="sw-watch-detail__dot" :class="`is-${watchDoc.availability}`" />
        <span class="sw-label">{{ availabilityLabel }}</span>
      </div>

      <button class="sw-btn sw-btn--solid sw-watch-detail__cta" type="button" @click="openInquiry">
        {{ locale.t('watchDetail.requestInfo') }}
      </button>
    </div>
  </article>

  <transition name="sw-fade">
    <div v-if="isFullscreen && watchDoc" class="sw-lightbox" @click="isFullscreen = false">
      <button class="sw-lightbox__close" type="button" :aria-label="locale.t('watchDetail.close')">{{ locale.t('watchDetail.close') }}</button>
      <SmartImage :src="watchDoc.images[activeIndex]" :alt="watchDoc.name" eager object-fit="contain" />
    </div>
  </transition>
  </div>
</template>

<style scoped>
.sw-watch-detail {
  padding: calc(var(--header-height) + 32px) var(--container-pad) 120px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: clamp(32px, 5vw, 96px);
  align-items: start;
}

.sw-watch-detail__main {
  cursor: zoom-in;
  background: var(--surface-media);
}

.sw-watch-detail__thumbs {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.sw-watch-detail__thumb {
  width: 76px;
  height: 76px;
  overflow: hidden;
  opacity: 0.5;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__thumb.is-active,
.sw-watch-detail__thumb:hover {
  opacity: 1;
}

.sw-watch-detail__info {
  position: sticky;
  top: calc(var(--header-height) + 32px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sw-watch-detail__brand {
  color: var(--text-muted);
}

.sw-watch-detail__price {
  font-size: 1.375rem;
  margin-top: 8px;
}

.sw-watch-detail__desc {
  margin-top: 24px;
}

.sw-watch-detail__specs {
  margin-top: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.sw-watch-detail__spec dd {
  margin-top: 6px;
}

.sw-watch-detail__availability {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 32px;
}

.sw-watch-detail__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sw-gray-400);
}

.sw-watch-detail__dot.is-in-stock {
  background: #3b7a4a;
}

.sw-watch-detail__dot.is-reserved {
  background: #b8862f;
}

.sw-watch-detail__dot.is-sold {
  background: var(--sw-burgundy);
}

.sw-watch-detail__cta {
  margin-top: 32px;
  width: fit-content;
}

.sw-watch-detail__notfound {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
  padding: 0 var(--container-pad);
}

.sw-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 10, 10, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.sw-lightbox__close {
  position: absolute;
  top: 28px;
  right: var(--container-pad);
  color: var(--sw-white);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .sw-watch-detail {
    grid-template-columns: 1fr;
  }

  .sw-watch-detail__info {
    position: static;
  }
}
</style>
