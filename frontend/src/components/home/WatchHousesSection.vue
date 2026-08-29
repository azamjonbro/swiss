<script setup lang="ts">
/**
 * A cinematic, single-focus filmstrip through the houses SwissWatch Premium
 * represents — not a category grid. One house is centred and legible at a
 * time; its neighbours sit dimmed and partially visible either side, the
 * way a gallery filmstrip works rather than a SaaS carousel. Product
 * photography comes from that brand's own Watch records (via the shared
 * getBrandWatches cache) — no invented imagery, no fabricated metadata: the
 * only copy shown (name, country, founding year) is real Brand data.
 */
import { ref, computed, useTemplateRef, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue';
import { useRouter } from 'vue-router';
import type { Brand, Watch } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import { getBrandWatches } from '@/utils/brandWatches';
import { primaryImage } from '@/utils/format';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  brands: Brand[];
}

const props = defineProps<Props>();
const locale = useLocaleStore();
const router = useRouter();

const watchesByBrand = ref<Record<string, Watch[]>>({});
const activeIndex = ref(0);
/** Continuous 0–1+ distance-from-centre per brand id, read by the template
 * to drive scale/opacity — updated on scroll, not on every render. */
const distances = ref<Record<string, number>>({});

const trackEl = useTemplateRef<HTMLUListElement>('trackEl');
const itemEls = new Map<string, HTMLElement>();

function setItemEl(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) itemEls.set(id, el);
  else itemEls.delete(id);
}

// Callers prefetch by index, so a short brand list hands us undefined.
async function loadWatches(brand: Brand | undefined) {
  if (!brand || watchesByBrand.value[brand._id]) return;
  try {
    const watches = await getBrandWatches(brand._id);
    watchesByBrand.value = { ...watchesByBrand.value, [brand._id]: watches };
  } catch (err) {
    console.error('Failed to load watches for brand', err);
  }
}

let ticking = false;

function measure() {
  ticking = false;
  const track = trackEl.value;
  if (!track) return;

  const trackRect = track.getBoundingClientRect();
  const centre = trackRect.left + trackRect.width / 2;
  const halfWidth = trackRect.width / 2 || 1;

  let closestId = props.brands[0]?._id;
  let closestDist = Infinity;
  const next: Record<string, number> = {};

  for (const brand of props.brands) {
    const el = itemEls.get(brand._id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const itemCentre = rect.left + rect.width / 2;
    const dist = Math.min(1, Math.abs(itemCentre - centre) / halfWidth);
    next[brand._id] = dist;
    if (dist < closestDist) {
      closestDist = dist;
      closestId = brand._id;
    }
  }

  distances.value = next;
  const nextIndex = props.brands.findIndex((b) => b._id === closestId);
  if (nextIndex !== -1 && nextIndex !== activeIndex.value) {
    activeIndex.value = nextIndex;
    loadWatches(props.brands[nextIndex]);
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(measure);
}

function distanceFor(id: string): number {
  // Continuous, drag-following distance is itself the motion — under reduced
  // motion, collapse it to a flat active/inactive state instead of tracking
  // scroll position frame-by-frame.
  if (prefersReducedMotion()) {
    return props.brands[activeIndex.value]?._id === id ? 0 : 1;
  }
  return distances.value[id] ?? 1;
}

function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
  const clamped = Math.max(0, Math.min(props.brands.length - 1, index));
  const el = itemEls.get(props.brands[clamped]?._id);
  el?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
}

function onStageClick(index: number) {
  if (index !== activeIndex.value) {
    scrollToIndex(index);
    return;
  }
  // The stage that's already centred is, in effect, the "Explore House" CTA
  // too — a larger, obvious click target than the small text link alone.
  router.push(`/brands/${props.brands[index].slug}`);
}

const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function onStageEnter(index: number) {
  if (!supportsHover || index === activeIndex.value) return;
  scrollToIndex(index);
}

const progressLabel = computed(() => {
  const total = props.brands.length;
  const current = Math.min(activeIndex.value + 1, total);
  return `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
});

const progressPct = computed(() =>
  props.brands.length > 1 ? (activeIndex.value / (props.brands.length - 1)) * 100 : 100,
);

function watchesFor(brand: Brand) {
  return watchesByBrand.value[brand._id] ?? [];
}

let ro: ResizeObserver | undefined;

onMounted(() => {
  loadWatches(props.brands[0]);
  loadWatches(props.brands[1]);
  measure();

  const track = trackEl.value;
  if (track) {
    track.addEventListener('scroll', onScroll, { passive: true });
    ro = new ResizeObserver(() => measure());
    ro.observe(track);
  }
  window.addEventListener('resize', onScroll, { passive: true });
});

onUnmounted(() => {
  trackEl.value?.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  ro?.disconnect();
});
</script>

<template>
  <section class="sw-houses sw-section--sm">
    <header class="sw-houses__header">
      <span v-reveal class="sw-eyebrow">{{ locale.t('category.eyebrow') }}</span>
      <h2 v-reveal="0.08" class="sw-h1 sw-houses__title">{{ locale.t('category.title') }}</h2>
    </header>

    <div class="sw-houses__stage-wrap">
      <ul ref="trackEl" class="sw-houses__track">
        <li
          v-for="(brand, index) in brands"
          :key="brand._id"
          :ref="(el) => setItemEl(brand._id, el)"
          class="sw-houses__item"
          :class="{ 'is-active': index === activeIndex }"
          :style="{ '--dist': distanceFor(brand._id) }"
        >
          <button
            type="button"
            class="sw-houses__stage"
            :tabindex="index === activeIndex ? 0 : -1"
            :aria-label="index === activeIndex ? `${locale.t('category.explore')}: ${brand.name}` : brand.name"
            :aria-current="index === activeIndex ? 'true' : undefined"
            data-cursor="View"
            @click="onStageClick(index)"
            @mouseenter="onStageEnter(index)"
          >
            <!--
              Eager, not lazy. This is a horizontally scrolled track, and the
              browser only ever triggered lazy loads for the handful of stages
              that started near the viewport — everything past roughly the
              seventh house stayed an empty black card no matter how far the
              visitor scrolled, because a stage that is already in the DOM and
              simply moved sideways never re-enters the intersection the loader
              is waiting on. The stage image IS this section's content, and a
              plaque is 3-7 KB at the width actually requested, so there is
              nothing to defer.
            -->
            <span class="sw-houses__photo" :class="{ 'is-plaque': !watchesFor(brand)[0] }">
              <template v-if="watchesFor(brand)[0]">
                <SmartImage
                  :src="primaryImage(watchesFor(brand)[0])"
                  :alt="`${brand.name} ${watchesFor(brand)[0].name}`"
                  object-fit="contain"
                  eager
                  sizes="(max-width: 1052px) 76vw, 800px"
                />
                <SmartImage
                  v-if="watchesFor(brand)[1]"
                  :src="primaryImage(watchesFor(brand)[1])"
                  :alt="`${brand.name} ${watchesFor(brand)[1].name}`"
                  object-fit="contain"
                  eager
                  class="sw-houses__photo-alt"
                  sizes="(max-width: 1052px) 76vw, 800px"
                />
              </template>
              <SmartImage
                v-else-if="brand.logo"
                :src="brand.logo"
                :alt="brand.name"
                eager
                sizes="(max-width: 1052px) 76vw, 800px"
              />
            </span>
            <span class="sw-houses__vignette" aria-hidden="true" />
          </button>

          <div class="sw-houses__meta">
            <span class="sw-houses__name">{{ brand.name }}</span>
            <span v-if="index === activeIndex" class="sw-houses__submeta">
              <span v-if="brand.country">{{ brand.country.toUpperCase() }}</span>
              <span v-if="brand.country && brand.founded" class="sw-houses__dot" aria-hidden="true">&middot;</span>
              <span v-if="brand.founded">{{ locale.t('category.est') }} {{ brand.founded }}</span>
            </span>
            <RouterLink
              v-if="index === activeIndex"
              :to="`/brands/${brand.slug}`"
              class="sw-houses__explore"
            >
              {{ locale.t('category.explore') }} <span aria-hidden="true">&rarr;</span>
            </RouterLink>
          </div>
        </li>
      </ul>
    </div>

    <div class="sw-houses__nav">
      <button
        type="button"
        class="sw-houses__arrow"
        :disabled="activeIndex === 0"
        :aria-label="locale.t('category.prev')"
        @click="scrollToIndex(activeIndex - 1)"
      >
        &larr;
      </button>

      <div class="sw-houses__progress">
        <span class="sw-houses__progress-label">{{ progressLabel }}</span>
        <span class="sw-houses__progress-track">
          <span class="sw-houses__progress-fill" :style="{ width: `${progressPct}%` }" />
        </span>
      </div>

      <button
        type="button"
        class="sw-houses__arrow"
        :disabled="activeIndex === brands.length - 1"
        :aria-label="locale.t('category.next')"
        @click="scrollToIndex(activeIndex + 1)"
      >
        &rarr;
      </button>
    </div>
  </section>
</template>

<style scoped>
.sw-houses {
  background: var(--sw-obsidian);
  color: var(--sw-white);
  overflow: hidden;
}

.sw-houses__header {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
  display: grid;
  gap: 20px;
  margin-bottom: clamp(48px, 6vw, 88px);
}

.sw-houses__title {
  color: var(--sw-white);
}

.sw-houses__stage-wrap {
  position: relative;
}

/* Uniform item width keeps scroll-snap math stable; the "centre is bigger"
   illusion comes entirely from the continuous --dist-driven transform below,
   not from resizing items themselves. */
.sw-houses__track {
  display: flex;
  gap: clamp(16px, 2.4vw, 32px);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-block: 12px;
  /* Centres the first and last item within the viewport, same trick as
     centring any item: pad by half the viewport minus half an item. */
  padding-inline: calc(50% - min(38vw, 400px));
}

.sw-houses__track::-webkit-scrollbar {
  display: none;
}

.sw-houses__item {
  flex: 0 0 min(76vw, 800px);
  scroll-snap-align: center;
  display: grid;
  gap: 20px;
}

.sw-houses__stage {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #0c0b0a;
  border: 1px solid rgba(253, 252, 250, 0.08);
  /* Continuous scale/opacity/brightness driven by --dist (0 = centred, 1 =
     fully off to the side) — this is what makes the reveal feel like one
     smooth cinematic sweep rather than a hard active/inactive toggle. */
  transform: scale(calc(1 - var(--dist, 0) * 0.24));
  opacity: calc(1 - var(--dist, 0) * 0.62);
  filter: brightness(calc(1 - var(--dist, 0) * 0.28));
  transition:
    transform 0.6s var(--ease-editorial),
    opacity 0.6s var(--ease-editorial),
    filter 0.6s var(--ease-editorial),
    border-color 0.6s var(--ease-editorial);
}

.sw-houses__item.is-active .sw-houses__stage {
  border-color: rgba(253, 252, 250, 0.18);
}

.sw-houses__photo,
.sw-houses__photo-alt {
  position: absolute;
  /* Sized to the photography's own aspect (portrait product shots, the same
     4:5 crop WatchCard uses) rather than a fixed inset on the landscape
     stage — a container proportioned like the image is what lets the mask
     below actually reach its edges. Fixed insets left a narrow hard-edged
     rectangle stranded inside a much wider fade, which read as a pasted-on
     sticker rather than photography sitting in a dark set. */
  top: 6%;
  bottom: 6%;
  left: 50%;
  width: auto;
  aspect-ratio: 4 / 5;
  transform: translateX(-50%);
  -webkit-mask-image: radial-gradient(66% 64% at 50% 46%, #000 56%, transparent 100%);
  mask-image: radial-gradient(66% 64% at 50% 46%, #000 56%, transparent 100%);
}

/* A house whose pieces aren't in the catalogue yet has no photography to put
   on the stage, and an empty stage reads as a broken card. It falls back to
   that brand's own plaque, which is already cut to the same 4:5 as the
   product shots, so it drops straight into this container. The mask comes
   off for it: that fade is tuned to dissolve the edges of a watch on a
   backdrop, and over a wordmark it eats the ends of the longer names. The
   plaque's own ground is a shade above the stage's, so its edge still reads
   as an inset card rather than a pasted rectangle. */
.sw-houses__photo.is-plaque {
  -webkit-mask-image: none;
  mask-image: none;
}

.sw-houses__photo :deep(.sw-smart-image),
.sw-houses__photo :deep(.sw-smart-image__img),
.sw-houses__photo-alt :deep(.sw-smart-image),
.sw-houses__photo-alt :deep(.sw-smart-image__img) {
  height: 100%;
}

/* Same photographic grade used for the hero and campaign band, so every dark
   cinematic surface on the page reads as one consistent treatment — and it
   quietly calms the generated placeholders' pale backdrop toward the
   section's own dark tone rather than leaving a bright rectangle. */
.sw-houses__photo :deep(.sw-smart-image__img),
.sw-houses__photo-alt :deep(.sw-smart-image__img) {
  filter: saturate(0.88) contrast(1.06) brightness(0.94);
  transition: transform 2.4s var(--ease-editorial);
}

/* A whisper of horizontal parallax: the photo drifts opposite the item's own
   offset from centre, capped well under any threshold a viewer would
   consciously register. */
.sw-houses__item .sw-houses__photo :deep(.sw-smart-image__img) {
  transform: translateX(calc(var(--dist, 0) * -10px)) scale(1.015);
}

.sw-houses__item.is-active .sw-houses__photo :deep(.sw-smart-image__img) {
  transform: translateX(0) scale(1.035);
}

.sw-houses__photo-alt {
  opacity: 0;
}

.sw-houses__item.is-active .sw-houses__photo-alt {
  animation: sw-houses-crossfade 8s var(--ease-editorial) infinite;
}

@keyframes sw-houses-crossfade {
  0%,
  40% {
    opacity: 0;
  }
  58%,
  84% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Heavier toward the edges than the middle — crushes any pale placeholder
   backdrop into the section's own dark surface while leaving the product
   itself, centred in the frame, legible. Standard campaign-photography
   vignette, not a flat filter. */
.sw-houses__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Lighter than the mask above — this is just ambient depth toward the
     frame's corners, not the mechanism doing the actual edge work. */
  background: radial-gradient(75% 75% at 50% 46%, rgba(6, 6, 6, 0) 0%, rgba(6, 6, 6, 0.3) 74%, rgba(6, 6, 6, 0.7) 100%);
}

.sw-houses__meta {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding-inline: 4px;
  opacity: calc(1 - var(--dist, 0) * 0.75);
  transition: opacity 0.6s var(--ease-editorial);
}

.sw-houses__name {
  font-family: var(--font-serif);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.05;
  color: var(--sw-white);
  font-size: calc(1.1rem + (2.6rem - 1.1rem) * (1 - min(var(--dist, 0), 1)));
}

.sw-houses__submeta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--accent);
}

.sw-houses__dot {
  opacity: 0.6;
}

.sw-houses__explore {
  margin-top: 4px;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(253, 252, 250, 0.86);
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-houses__explore:hover,
.sw-houses__explore:focus-visible {
  opacity: 0.7;
}

.sw-houses__nav {
  max-width: var(--container-max);
  margin: clamp(40px, 5vw, 64px) auto 0;
  padding-inline: var(--container-pad);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(20px, 3vw, 40px);
}

.sw-houses__arrow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(253, 252, 250, 0.2);
  border-radius: 50%;
  font-size: 0.75rem;
  color: rgba(253, 252, 250, 0.7);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}

.sw-houses__arrow:hover:not(:disabled),
.sw-houses__arrow:focus-visible:not(:disabled) {
  border-color: rgba(253, 252, 250, 0.5);
  color: var(--sw-white);
}

.sw-houses__arrow:disabled {
  opacity: 0.25;
}

.sw-houses__progress {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.sw-houses__progress-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: rgba(253, 252, 250, 0.5);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sw-houses__progress-track {
  position: relative;
  width: clamp(120px, 16vw, 220px);
  height: 1px;
  background: rgba(253, 252, 250, 0.16);
}

.sw-houses__progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--accent);
  transition: width 0.6s var(--ease-editorial);
}

@media (max-width: 900px) {
  .sw-houses__track {
    padding-inline: calc(50% - 42vw);
  }

  .sw-houses__item {
    flex-basis: 84vw;
  }

  .sw-houses__name {
    font-size: calc(1rem + (1.9rem - 1rem) * (1 - min(var(--dist, 0), 1)));
  }
}

@media (max-width: 560px) {
  .sw-houses__nav {
    gap: 20px;
  }

  .sw-houses__progress-track {
    width: 30vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-houses__stage,
  .sw-houses__photo :deep(.sw-smart-image__img) {
    transition: opacity 0.2s linear;
  }

  .sw-houses__item .sw-houses__photo :deep(.sw-smart-image__img) {
    transform: none;
  }

  .sw-houses__item.is-active .sw-houses__photo-alt {
    animation: none;
  }
}
</style>
