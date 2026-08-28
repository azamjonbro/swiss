<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Watch } from '@/types/models';
import { fetchWatchBySlug } from '@/services/watches';
import { toBrandName, toBrandSlug, colorSwatchHex } from '@/utils/format';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { useAccountStore } from '@/stores/account';
import { useSavedStore } from '@/stores/saved';
import { useCartStore } from '@/stores/cart';
import { applyJsonLd, applySeo, site } from '@/utils/seo';
import type { CrumbItem } from '@/seo/schema.mjs';
import {
  breadcrumbSchema,
  productPath,
  productSchema,
  staticSeo,
  watchImageAlt,
  watchSeo,
} from '@/seo/schema.mjs';
import SmartImage from '@/components/shared/SmartImage.vue';
import SmartVideo from '@/components/shared/SmartVideo.vue';
import RelatedProductsCarousel from '@/components/watch/RelatedProductsCarousel.vue';
import Breadcrumbs from '@/components/shared/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const locale = useLocaleStore();
const currency = useCurrencyStore();
const account = useAccountStore();
const saved = useSavedStore();
const cart = useCartStore();

const watchDoc = ref<Watch | null>(null);
const isLoading = ref(true);
const notFound = ref(false);

const activeIndex = ref(0);
const isFullscreen = ref(false);
const isZoomed = ref(false);
const zoomOrigin = ref('50% 50%');
const quantity = ref(1);
const justAdded = ref(false);

const brandName = computed(() => (watchDoc.value ? toBrandName(watchDoc.value.brand) : ''));
const brandSlug = computed(() => (watchDoc.value ? toBrandSlug(watchDoc.value.brand) : ''));

const variants = computed(() => watchDoc.value?.variants ?? []);
const selectedVariant = computed(() => {
  const slug = route.query.variant as string | undefined;
  return variants.value.find((v) => v.colorSlug === slug) ?? variants.value[0];
});

// The video, when the colorway has one, rides at the end of the same gallery
// strip as extra slide(s) — one thumbnail rail, one active-index, rather than
// a separate video widget bolted on beside it.
type GalleryItem = { type: 'image' | 'video'; src: string };
const galleryItems = computed<GalleryItem[]>(() => {
  const v = selectedVariant.value;
  if (!v) return [];
  const items: GalleryItem[] = v.images.map((src) => ({ type: 'image', src }));
  for (const src of v.videos ?? []) items.push({ type: 'video', src });
  return items;
});
const activeItem = computed<GalleryItem | undefined>(() => galleryItems.value[activeIndex.value]);

function selectVariant(colorSlug: string) {
  if (colorSlug === selectedVariant.value?.colorSlug) return;
  activeIndex.value = 0;
  isZoomed.value = false;
  router.replace({ query: { ...route.query, variant: colorSlug } });
}

function toggleZoom() {
  if (activeItem.value?.type !== 'image') return;
  // On touch the same tap is how the gallery is swiped, so zoom is reserved
  // for pointers that can hover — the lightbox covers phones instead.
  if (window.matchMedia('(hover: none)').matches) return;
  isZoomed.value = !isZoomed.value;
}

function onMainMouseMove(event: MouseEvent) {
  if (!isZoomed.value) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  zoomOrigin.value = `${x}% ${y}%`;
}

function openFullscreen() {
  if (activeItem.value?.type !== 'image') return;
  isFullscreen.value = true;
}

function stepGallery(direction: 1 | -1) {
  if (!galleryItems.value.length) return;
  isZoomed.value = false;
  activeIndex.value = (activeIndex.value + direction + galleryItems.value.length) % galleryItems.value.length;
}

function selectItem(index: number) {
  isZoomed.value = false;
  activeIndex.value = index;
}

// Horizontal swipe on the main frame — the phone equivalent of the thumb rail.
const touchStart = ref({ x: 0, y: 0 });

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0];
  touchStart.value = { x: touch.clientX, y: touch.clientY };
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.value.x;
  const dy = touch.clientY - touchStart.value.y;
  // Ignore anything that reads as a vertical scroll or an ordinary tap.
  if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy)) return;
  stepGallery(dx < 0 ? 1 : -1);
}

const specs = computed(() => {
  if (!watchDoc.value) return [];
  const w = watchDoc.value;
  // Accessories (straps, crowns, clasps) leave several of these blank —
  // join only the parts actually present so an empty caseMaterial/caseSize
  // pair never renders as a bare ", ".
  const caseValue = [w.caseMaterial, w.caseSize].filter(Boolean).join(', ');
  return [
    { label: locale.t('watchDetail.reference'), value: w.reference },
    { label: locale.t('watchDetail.movement'), value: w.movement },
    { label: locale.t('watchDetail.case'), value: caseValue },
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

const storyImage = computed(() => {
  const images = selectedVariant.value?.images ?? [];
  return images[1] ?? images[0];
});

async function load(slug: string) {
  isLoading.value = true;
  notFound.value = false;
  activeIndex.value = 0;
  isZoomed.value = false;
  quantity.value = 1;
  try {
    watchDoc.value = await fetchWatchBySlug(slug);
    // Default the URL to an actual colorway so the page is shareable at a
    // specific variant even before anyone touches the swatches.
    const requested = route.query.variant as string | undefined;
    const isValid = watchDoc.value.variants.some((v) => v.colorSlug === requested);
    if (!isValid && watchDoc.value.variants[0]) {
      router.replace({ query: { ...route.query, variant: watchDoc.value.variants[0].colorSlug } });
    }
    applyProductSeo(watchDoc.value);
  } catch {
    notFound.value = true;
    // A slug that no longer resolves must not leave the previous product's
    // title, canonical or Product schema standing — and must not be indexed.
    const seo = staticSeo('not-found', site);
    if (seo) applySeo({ ...seo, canonical: route.path });
    applyJsonLd([]);
  } finally {
    isLoading.value = false;
  }
}

/** Home → Watches → Brand → this product, for the nav and the JSON-LD alike. */
const crumbs = computed<CrumbItem[]>(() => {
  if (!watchDoc.value) return [];
  const trail: CrumbItem[] = [
    { name: locale.t('nav.home'), path: '/' },
    { name: locale.t('nav.watches'), path: '/watches' },
  ];
  if (brandSlug.value) trail.push({ name: brandName.value, path: `/brands/${brandSlug.value}` });
  trail.push({ name: watchDoc.value.name, path: productPath(watchDoc.value.slug) });
  return trail;
});

/**
 * Product metadata and structured data, built from the record the API just
 * returned — Product/Offer/Brand plus the breadcrumb trail the page renders.
 */
function applyProductSeo(watch: Watch) {
  const seo = watchSeo(watch, site);
  applySeo({ ...seo, imageAlt: watchImageAlt(watch) });
  applyJsonLd([productSchema(watch, site), breadcrumbSchema(crumbs.value, site)]);
}

onMounted(() => load(route.params.slug as string));
watch(
  () => route.params.slug,
  (slug) => {
    if (slug) load(slug as string);
  },
);
watch(
  () => locale.lang,
  () => load(route.params.slug as string),
);

const isSaved = computed(() => Boolean(watchDoc.value && saved.has(watchDoc.value._id)));
const isSavePending = computed(() => Boolean(watchDoc.value && saved.pendingId === watchDoc.value._id));

async function toggleSaved() {
  if (!watchDoc.value) return;
  // A click landing before the startup session restore has settled would
  // otherwise read as "signed out"; wait for the same in-flight promise.
  if (!account.isReady) await account.restoreSession();
  // Saving requires an account; visitors are sent to sign in and returned here.
  if (!account.isAuthenticated) {
    router.push({ name: 'account-login', query: { redirect: route.fullPath } });
    return;
  }
  await saved.toggle(watchDoc.value._id);
}

function openInquiry() {
  if (!watchDoc.value) return;
  ui.openInquiry({ id: watchDoc.value._id, name: `${brandName.value} ${watchDoc.value.name}` });
}

function cartItemFromCurrent(watch: Watch, variant: Watch['variants'][number]) {
  return {
    key: `${watch._id}:${variant.colorSlug}`,
    watchId: watch._id,
    slug: watch.slug,
    name: watch.name,
    brandName: toBrandName(watch.brand) || brandName.value,
    image: variant.images[0],
    price: watch.price,
    colorLabel: variant.colorLabel || undefined,
    isAccessory: watch.type === 'accessory',
  };
}

function addToCart() {
  if (!watchDoc.value || !selectedVariant.value) return;
  cart.add(cartItemFromCurrent(watchDoc.value, selectedVariant.value), quantity.value);
  justAdded.value = true;
  window.setTimeout(() => (justAdded.value = false), 1600);
}

function buyNow() {
  if (!watchDoc.value || !selectedVariant.value) return;
  addToCart();
  ui.openInquiry({ id: watchDoc.value._id, name: watchDoc.value.name }, cart.buildInquiryMessage());
}

function addAccessoryToCart(accessory: Watch) {
  const variant = accessory.variants[0];
  if (!variant) return;
  cart.add(cartItemFromCurrent(accessory, variant), 1);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isFullscreen.value = false;
    return;
  }
  if (!isFullscreen.value) return;
  if (event.key === 'ArrowRight') stepGallery(1);
  else if (event.key === 'ArrowLeft') stepGallery(-1);
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

  <template v-else-if="watchDoc">
    <Breadcrumbs class="sw-watch-detail__breadcrumb" :items="crumbs" />

    <article class="sw-watch-detail">
      <div class="sw-watch-detail__gallery">
        <div class="sw-watch-detail__stage">
          <div
            class="sw-watch-detail__main"
            :class="{ 'is-video': activeItem?.type === 'video', 'is-zoomed': isZoomed }"
            :style="isZoomed ? { '--zoom-origin': zoomOrigin } : undefined"
            @click="toggleZoom"
            @mousemove="onMainMouseMove"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <SmartVideo
              v-if="activeItem?.type === 'video'"
              :src="activeItem.src"
              :poster="selectedVariant?.images[0]"
              :alt="watchImageAlt(watchDoc)"
              playback-strategy="manual"
              object-fit="contain"
            />
            <SmartImage v-else :src="activeItem?.src" :alt="watchImageAlt(watchDoc, activeIndex)" eager object-fit="contain" />
          </div>

          <button
            v-if="activeItem?.type === 'image'"
            class="sw-watch-detail__expand"
            type="button"
            :aria-label="locale.t('watchDetail.close')"
            @click.stop="openFullscreen"
          >
            &#x2922;
          </button>

          <template v-if="galleryItems.length > 1">
            <button
              class="sw-watch-detail__nav sw-watch-detail__nav--prev"
              type="button"
              aria-label="Previous"
              @click.stop="stepGallery(-1)"
            >
              &larr;
            </button>
            <button
              class="sw-watch-detail__nav sw-watch-detail__nav--next"
              type="button"
              aria-label="Next"
              @click.stop="stepGallery(1)"
            >
              &rarr;
            </button>
            <span class="sw-watch-detail__counter" aria-hidden="true">
              {{ activeIndex + 1 }} / {{ galleryItems.length }}
            </span>
          </template>
        </div>

        <div v-if="galleryItems.length > 1" class="sw-watch-detail__thumbs">
          <button
            v-for="(item, i) in galleryItems"
            :key="item.src + i"
            class="sw-watch-detail__thumb"
            :class="{ 'is-active': i === activeIndex }"
            type="button"
            @click="selectItem(i)"
          >
            <SmartImage
              :src="item.type === 'video' ? selectedVariant?.images[0] : item.src"
              :alt="item.type === 'video' ? `${watchImageAlt(watchDoc)} video` : watchImageAlt(watchDoc, i)"
              aspect-ratio="1 / 1"
              object-fit="contain"
            />
            <span v-if="item.type === 'video'" class="sw-watch-detail__thumb-play" aria-hidden="true">&#9654;</span>
          </button>
        </div>
      </div>

      <div class="sw-watch-detail__info">
        <RouterLink v-if="brandSlug" :to="`/brands/${brandSlug}`" class="sw-label sw-watch-detail__brand">
          {{ brandName }}
        </RouterLink>
        <h1 class="sw-h1 sw-watch-detail__title">{{ watchDoc.name }}</h1>
        <p class="sw-watch-detail__price">{{ currency.format(watchDoc.price) }}</p>
        <p class="sw-body-lg sw-watch-detail__desc">{{ watchDoc.shortDescription }}</p>

        <div v-if="variants.length > 1" class="sw-watch-detail__colors">
          <span class="sw-label">{{ locale.t('watchDetail.color') }} — {{ selectedVariant?.colorLabel }}</span>
          <div class="sw-watch-detail__swatches">
            <button
              v-for="v in variants"
              :key="v.colorSlug"
              class="sw-watch-detail__swatch"
              :class="{ 'is-active': v.colorSlug === selectedVariant?.colorSlug }"
              type="button"
              :aria-label="v.colorLabel"
              :aria-pressed="v.colorSlug === selectedVariant?.colorSlug"
              @click="selectVariant(v.colorSlug)"
            >
              <span :style="{ background: colorSwatchHex(v.colorSlug) }" />
            </button>
          </div>
        </div>

        <div class="sw-watch-detail__availability">
          <span class="sw-watch-detail__dot" :class="`is-${watchDoc.availability}`" />
          <span class="sw-label">{{ availabilityLabel }}</span>
        </div>

        <div class="sw-watch-detail__purchase">
          <div class="sw-watch-detail__qty">
            <span class="sw-label">{{ locale.t('watchDetail.quantity') }}</span>
            <div class="sw-watch-detail__stepper">
              <button type="button" aria-label="-" @click="quantity = Math.max(1, quantity - 1)">&minus;</button>
              <span>{{ quantity }}</span>
              <button type="button" aria-label="+" @click="quantity = Math.min(10, quantity + 1)">&plus;</button>
            </div>
          </div>

          <div class="sw-watch-detail__actions">
            <button class="sw-btn sw-btn--solid sw-watch-detail__cta" type="button" @click="addToCart">
              {{ justAdded ? locale.t('watchDetail.addedToCart') : locale.t('watchDetail.addToCart') }}
            </button>
            <button class="sw-btn sw-watch-detail__buy" type="button" @click="buyNow">
              {{ locale.t('watchDetail.buyNow') }}
            </button>
          </div>

          <div class="sw-watch-detail__secondary">
            <button class="sw-btn sw-watch-detail__inquire" type="button" @click="openInquiry">
              {{ locale.t('watchDetail.requestInfo') }}
            </button>
            <button
              class="sw-btn sw-watch-detail__save"
              :class="{ 'is-saved': isSaved }"
              type="button"
              :disabled="isSavePending"
              :aria-pressed="isSaved"
              @click="toggleSaved"
            >
              {{ isSaved ? locale.t('watchDetail.saved') : locale.t('watchDetail.save') }}
            </button>
          </div>
        </div>

        <div v-if="watchDoc.accessories?.length" class="sw-watch-detail__pair">
          <span class="sw-label">{{ locale.t('watchDetail.pairItWith') }}</span>
          <ul class="sw-watch-detail__pair-list">
            <li v-for="accessory in watchDoc.accessories" :key="accessory._id" class="sw-watch-detail__pair-item">
              <RouterLink :to="productPath(accessory.slug)" class="sw-watch-detail__pair-media" tabindex="-1" aria-hidden="true">
                <SmartImage :src="accessory.variants[0]?.images[0]" :alt="watchImageAlt(accessory)" aspect-ratio="1 / 1" object-fit="contain" />
              </RouterLink>
              <div class="sw-watch-detail__pair-body">
                <RouterLink :to="productPath(accessory.slug)" class="sw-watch-detail__pair-name">{{ accessory.name }}</RouterLink>
                <span class="sw-watch-detail__pair-price">{{ currency.format(accessory.price) }}</span>
              </div>
              <button class="sw-watch-detail__pair-add" type="button" @click="addAccessoryToCart(accessory)">
                {{ locale.t('watchDetail.add') }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </article>

    <section v-if="watchDoc.description" class="sw-watch-story">
      <div class="sw-watch-story__media">
        <SmartImage :src="storyImage" :alt="watchImageAlt(watchDoc, 1)" aspect-ratio="4 / 5" />
      </div>
      <div class="sw-watch-story__body">
        <span class="sw-eyebrow">{{ locale.t('watchDetail.theStory') }}</span>
        <p class="sw-body-lg">{{ watchDoc.description }}</p>
      </div>
    </section>

    <section v-if="specs.length" class="sw-watch-specs">
      <span class="sw-eyebrow">{{ locale.t('watchDetail.specifications') }}</span>
      <dl class="sw-watch-specs__grid">
        <div v-for="spec in specs" :key="spec.label" class="sw-watch-specs__row">
          <dt class="sw-label">{{ spec.label }}</dt>
          <dd class="sw-body">{{ spec.value }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="watchDoc.related?.length" class="sw-watch-related-section">
      <span class="sw-eyebrow">{{ locale.t('watchDetail.relatedTitle') }}</span>
      <RelatedProductsCarousel :watches="watchDoc.related" />
    </section>
  </template>

  <transition name="sw-fade">
    <div
      v-if="isFullscreen && watchDoc"
      class="sw-lightbox"
      @click.self="isFullscreen = false"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <button class="sw-lightbox__close" type="button" :aria-label="locale.t('watchDetail.close')" @click="isFullscreen = false">
        {{ locale.t('watchDetail.close') }}
      </button>
      <button v-if="galleryItems.length > 1" class="sw-lightbox__arrow sw-lightbox__arrow--prev" type="button" aria-label="Previous" @click.stop="stepGallery(-1)">&larr;</button>
      <SmartImage :src="activeItem?.src" :alt="watchImageAlt(watchDoc, activeIndex)" eager object-fit="contain" />
      <button v-if="galleryItems.length > 1" class="sw-lightbox__arrow sw-lightbox__arrow--next" type="button" aria-label="Next" @click.stop="stepGallery(1)">&rarr;</button>
    </div>
  </transition>
  </div>
</template>

<style scoped>
/* Product-page type scale. The site-wide scale is editorial (huge headline,
   small everything else); a product page has to be read, so the imagery is
   capped and the reading column is set a full step larger throughout. */
.sw-watch-detail-page {
  --pd-title: clamp(2.4rem, 4.4vw, 3.9rem);
  --pd-body: clamp(1.0625rem, 1.15vw, 1.25rem);
  --pd-label: 0.8125rem;
  --pd-gallery-max: 640px;
  padding: calc(var(--header-height) + 32px) var(--container-pad) 0;
}

.sw-watch-detail__breadcrumb {
  margin-bottom: 28px;
}

.sw-watch-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 4.5vw, 88px);
  align-items: start;
  padding-bottom: 96px;
}

/* ---- Gallery ---- */

.sw-watch-detail__gallery {
  /* The frame is capped so the photograph never outshouts the copy beside
     it — on a wide screen the column is wider than the picture needs to be. */
  max-width: var(--pd-gallery-max);
  position: sticky;
  top: calc(var(--header-height) + 32px);
}

.sw-watch-detail__stage {
  position: relative;
}

.sw-watch-detail__main {
  position: relative;
  cursor: zoom-in;
  background: var(--surface-media);
  /* Square, contain-fit: product photography arrives with wildly different
     framing, and a 4/5 cover crop was cutting bracelets off the edge. */
  aspect-ratio: 1 / 1;
  overflow: hidden;
  padding: clamp(12px, 2.4vw, 32px);
}

.sw-watch-detail__main.is-video {
  cursor: default;
  padding: 0;
}

.sw-watch-detail__main.is-zoomed {
  cursor: zoom-out;
}

.sw-watch-detail__main.is-zoomed :deep(.sw-smart-image__img) {
  transform: scale(2);
  transform-origin: var(--zoom-origin, 50% 50%);
}

.sw-watch-detail__main :deep(.sw-smart-image__img) {
  transition: transform 0.2s var(--ease-out);
}

.sw-watch-detail__expand {
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  color: var(--sw-ink, #111);
  font-size: 1.15rem;
  transition: background var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__expand:hover {
  background: #fff;
}

.sw-watch-detail__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  color: #111;
  font-size: 1.05rem;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__nav:hover {
  background: #fff;
}

.sw-watch-detail__nav--prev {
  left: 12px;
}

.sw-watch-detail__nav--next {
  right: 12px;
}

.sw-watch-detail__stage:hover .sw-watch-detail__nav,
.sw-watch-detail__nav:focus-visible {
  opacity: 1;
}

.sw-watch-detail__counter {
  position: absolute;
  left: 16px;
  bottom: 16px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* Touch has no hover: the arrows stay put, and the swipe handler does the rest. */
@media (hover: none) {
  .sw-watch-detail__nav {
    opacity: 1;
  }
}

.sw-watch-detail__thumbs {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  /* A rail rather than a wrapping grid — a colorway with eight shots used to
     push a second and third row of thumbs down the page. */
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.sw-watch-detail__thumbs::-webkit-scrollbar {
  display: none;
}

.sw-watch-detail__thumb {
  position: relative;
  flex: 0 0 auto;
  width: clamp(68px, 7vw, 88px);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--surface-media);
  border: 1px solid transparent;
  opacity: 0.62;
  scroll-snap-align: start;
  transition: opacity var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__thumb-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--sw-white);
  background: rgba(10, 10, 10, 0.32);
  pointer-events: none;
}

.sw-watch-detail__thumb.is-active,
.sw-watch-detail__thumb:hover {
  opacity: 1;
}

.sw-watch-detail__thumb.is-active {
  border-color: var(--text);
}

/* ---- Info column ---- */

.sw-watch-detail__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sw-watch-detail__brand {
  color: var(--text-muted);
  font-size: var(--pd-label);
  letter-spacing: 0.18em;
}

.sw-watch-detail__title {
  font-size: var(--pd-title);
  margin-top: 10px;
}

.sw-watch-detail__price {
  font-family: var(--font-sans);
  font-size: clamp(1.35rem, 1.8vw, 1.75rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  margin-top: 14px;
}

.sw-watch-detail__desc {
  font-size: var(--pd-body);
  line-height: 1.7;
  max-width: 52ch;
  margin-top: 22px;
  color: var(--text-muted);
}

.sw-watch-detail__colors {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.sw-watch-detail__colors > .sw-label,
.sw-watch-detail__availability .sw-label,
.sw-watch-detail__qty .sw-label,
.sw-watch-detail__pair > .sw-label {
  font-size: var(--pd-label);
  letter-spacing: 0.16em;
}

.sw-watch-detail__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.sw-watch-detail__swatch {
  /* 44px is the tap-target floor; the old 30px circles were both hard to hit
     and too quiet to read as the page's colour filter. */
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 4px;
  border: 1px solid transparent;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__swatch span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--border) inset;
}

.sw-watch-detail__swatch.is-active,
.sw-watch-detail__swatch:hover {
  border-color: var(--text);
}

.sw-watch-detail__swatch.is-active {
  transform: scale(1.04);
}

.sw-watch-detail__availability {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 26px;
}

.sw-watch-detail__dot {
  width: 9px;
  height: 9px;
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

.sw-watch-detail__purchase {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sw-watch-detail__qty {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sw-watch-detail__stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.sw-watch-detail__stepper button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  transition: background var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__stepper button:hover {
  background: var(--surface-media);
}

.sw-watch-detail__stepper > span {
  min-width: 2ch;
  text-align: center;
}

.sw-watch-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.sw-watch-detail__cta,
.sw-watch-detail__buy {
  flex: 1;
  min-width: 190px;
  justify-content: center;
  font-size: 0.8125rem;
  letter-spacing: 0.18em;
}

.sw-watch-detail__buy {
  border: 1px solid var(--text);
  padding: 20px 32px;
}

.sw-watch-detail__buy::before,
.sw-watch-detail__buy::after {
  display: none;
}

.sw-watch-detail__secondary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px 36px;
}

.sw-watch-detail__inquire,
.sw-watch-detail__save {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
}

.sw-watch-detail__save.is-saved {
  color: var(--accent);
}

.sw-watch-detail__save[disabled] {
  opacity: 0.45;
}

.sw-watch-detail__pair {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.sw-watch-detail__pair-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sw-watch-detail__pair-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.sw-watch-detail__pair-media {
  display: block;
  background: var(--surface-media);
}

.sw-watch-detail__pair-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sw-watch-detail__pair-name {
  font-size: 1.02rem;
  line-height: 1.4;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__pair-name:hover {
  opacity: 0.7;
}

.sw-watch-detail__pair-price {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.sw-watch-detail__pair-add {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  padding: 12px 20px;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-watch-detail__pair-add:hover {
  background: var(--bg-inverse);
  color: var(--text-inverse);
  border-color: var(--bg-inverse);
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

/* ---- Story / specs ---- */

.sw-watch-story {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(32px, 5vw, 80px);
  align-items: center;
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.sw-watch-story__media {
  background: var(--surface-media);
  max-width: 520px;
}

.sw-watch-story__body .sw-body-lg {
  margin-top: 18px;
  font-size: var(--pd-body);
  line-height: 1.8;
  max-width: 60ch;
}

.sw-watch-specs {
  padding: 64px 0 96px;
  border-top: 1px solid var(--border);
}

.sw-watch-specs__grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px 28px;
}

.sw-watch-specs__row dt {
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  color: var(--text-muted);
}

.sw-watch-specs__row dd {
  margin-top: 8px;
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--text);
}

.sw-watch-related-section {
  padding: 0 0 120px;
  border-top: 1px solid var(--border);
  padding-top: 64px;
}

.sw-watch-related-section > .sw-eyebrow {
  display: block;
  margin-bottom: 32px;
}

/* ---- Lightbox ---- */

.sw-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 10, 10, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 5vw, 40px);
}

/* The image fills the whole padded box and paints its own opaque backing, so
   the controls have to be lifted above it or they disappear behind the photo
   on phones, where the padding is too small to leave them any clear margin. */
.sw-lightbox :deep(.sw-smart-image) {
  background: transparent;
}

.sw-lightbox__close {
  position: absolute;
  top: 12px;
  right: calc(var(--container-pad) - 12px);
  z-index: 1;
  padding: 16px 12px;
  color: var(--sw-white);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sw-lightbox__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  color: var(--sw-white);
  font-size: 1.5rem;
  padding: 12px;
}

.sw-lightbox__arrow--prev {
  left: var(--container-pad);
}

.sw-lightbox__arrow--next {
  right: var(--container-pad);
}

/* ---- Responsive ----
   Three steps: the two-column desktop layout collapses to one column at the
   tablet width, then the info column loses its side-by-side rows on phones. */

@media (max-width: 1180px) {
  .sw-watch-detail-page {
    --pd-gallery-max: 560px;
  }

  .sw-watch-specs__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .sw-watch-detail {
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
    padding-bottom: 64px;
  }

  .sw-watch-detail-page {
    --pd-gallery-max: 100%;
  }

  .sw-watch-detail__gallery {
    position: static;
    /* Centred rather than stretched: a full-width square on a tablet is a
       screenful of watch before a single line of copy. */
    max-width: 540px;
    margin-inline: auto;
    width: 100%;
  }

  .sw-watch-detail__info {
    position: static;
  }

  .sw-watch-story {
    grid-template-columns: minmax(0, 1fr);
    padding: 56px 0;
  }

  .sw-watch-story__media {
    max-width: 440px;
  }

  .sw-watch-specs {
    padding: 48px 0 64px;
  }

  .sw-watch-related-section {
    padding-top: 48px;
    padding-bottom: 80px;
  }
}

@media (max-width: 640px) {
  .sw-watch-detail-page {
    --pd-title: clamp(1.9rem, 7.4vw, 2.5rem);
    --pd-body: 1.0625rem;
    padding-top: calc(var(--header-height) + 16px);
  }

  .sw-watch-detail__breadcrumb {
    margin-bottom: 18px;
  }

  .sw-watch-detail__gallery {
    /* Edge to edge — the container padding is clawed back so the photograph
       gets the full width it needs at this size. */
    max-width: none;
    width: calc(100% + var(--container-pad) * 2);
    margin-inline: calc(var(--container-pad) * -1);
  }

  .sw-watch-detail__thumbs {
    padding-inline: var(--container-pad);
  }

  .sw-watch-detail__desc {
    max-width: none;
  }

  .sw-watch-detail__actions {
    flex-direction: column;
  }

  .sw-watch-detail__cta,
  .sw-watch-detail__buy {
    width: 100%;
    min-width: 0;
    padding-inline: 20px;
  }

  .sw-watch-detail__secondary {
    gap: 16px 28px;
  }

  .sw-watch-detail__pair-item {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px 14px;
  }

  .sw-watch-detail__pair-add {
    grid-column: 2;
    justify-self: start;
  }

  .sw-watch-specs__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }

  .sw-lightbox__arrow {
    font-size: 1.25rem;
    padding: 8px;
  }
}

@media (max-width: 380px) {
  .sw-watch-detail__swatch {
    width: 40px;
    height: 40px;
  }

  .sw-watch-detail__nav {
    width: 40px;
    height: 40px;
  }
}
</style>
