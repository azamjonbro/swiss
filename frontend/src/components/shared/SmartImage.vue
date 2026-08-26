<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { resolveMediaUrl } from '@/utils/media';

interface Props {
  src?: string | null;
  alt: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain';
  eager?: boolean;
  /** Card thumbnails only — see the trimmed-derivative note below. */
  preferTrimmed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  aspectRatio: undefined,
  objectFit: 'cover',
  eager: false,
  preferTrimmed: false,
});

const loaded = ref(false);
const errored = ref(false);
/** Index into `candidates` of the URL currently being attempted. */
const candidateIndex = ref(0);

const JPG_PNG = /^\/(images|uploads\/images)\/.+\.(jpe?g|png)$/i;

/**
 * Ordered fallback chain, tried in turn via onError so a missing derivative
 * costs one failed request rather than a broken image.
 *
 * When `preferTrimmed` is set (product-grid card thumbnails), a
 * background-removed "<name>_trim" derivative is tried first — real ML
 * segmentation (scripts/remove-product-bg.py, rembg/u2net), not a white-pixel
 * threshold, so it also works on the handful of dark editorial/lifestyle
 * shots. Source photography carries wildly inconsistent amounts of margin
 * baked into the file (some shots ~60% empty space, others ~95% watch),
 * which made cards look randomly different in scale even in identical
 * containers; the derivative is cropped to the watch's actual content box
 * (plus a little breathing room) so it reads at a consistent size everywhere,
 * and — since it's true alpha transparency rather than a baked-in white
 * background — shows correctly in both the light and dark theme. Only .webp
 * and .png carry alpha (a JPEG can't), so this chain always ends on the
 * untouched original JPEG, which is guaranteed to exist.
 */
const candidates = computed(() => {
  const src = props.src ?? '';
  const isJpgPng = JPG_PNG.test(src);
  const list: string[] = [];

  if (props.preferTrimmed && isJpgPng) {
    const trimBase = src.replace(/\.(jpe?g|png)$/i, '_trim');
    list.push(resolveMediaUrl(`${trimBase}.webp`));
    list.push(resolveMediaUrl(`${trimBase}.png`));
  }
  // Everything under /public/images, plus the product photography in
  // backend/uploads/images, ships with a WebP sibling (roughly an eighth of
  // the JPEG's weight).
  if (isJpgPng) {
    list.push(resolveMediaUrl(src.replace(/\.(jpe?g|png)$/i, '.webp')));
  }
  list.push(resolveMediaUrl(src));
  return list;
});

const displaySrc = computed(() => candidates.value[candidateIndex.value] ?? '');

watch(
  () => [props.src, props.preferTrimmed],
  () => {
    loaded.value = false;
    errored.value = false;
    candidateIndex.value = 0;
  },
);

function onLoad() {
  loaded.value = true;
}

function onError() {
  if (candidateIndex.value < candidates.value.length - 1) {
    candidateIndex.value += 1;
    return;
  }
  errored.value = true;
}
</script>

<template>
  <div class="sw-smart-image" :style="aspectRatio ? { aspectRatio } : undefined">
    <div class="sw-smart-image__placeholder" :class="{ 'is-hidden': loaded }" />
    <img
      v-if="displaySrc && !errored"
      :key="displaySrc"
      :src="displaySrc"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :decoding="eager ? 'sync' : 'async'"
      :fetchpriority="eager ? 'high' : 'auto'"
      class="sw-smart-image__img"
      :class="{ 'is-loaded': loaded }"
      :style="{ objectFit }"
      @load="onLoad"
      @error="onError"
    />
    <div v-else class="sw-smart-image__fallback" aria-hidden="true" />
  </div>
</template>

<style scoped>
.sw-smart-image {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: var(--surface-media);
}

.sw-smart-image__placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, var(--surface-media) 0%, var(--surface-media-hi) 50%, var(--surface-media) 100%);
  background-size: 200% 100%;
  animation: sw-shimmer 1.8s ease-in-out infinite;
  transition: opacity var(--dur-mid) var(--ease-luxury);
}

.sw-smart-image__placeholder.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.sw-smart-image__img {
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(1.03);
  transition: opacity var(--dur-slow) var(--ease-luxury), transform 1.4s var(--ease-luxury);
}

.sw-smart-image__img.is-loaded {
  opacity: 1;
  transform: scale(1);
}

.sw-smart-image__fallback {
  position: absolute;
  inset: 0;
  background: var(--surface-media);
}

@keyframes sw-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-smart-image__img {
    transition: opacity var(--dur-fast) linear;
    transform: none;
  }
}
</style>
