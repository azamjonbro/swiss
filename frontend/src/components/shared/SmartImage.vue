<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { resolveMediaUrl } from '@/utils/media';

interface Props {
  src?: string | null;
  alt: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain';
  eager?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  aspectRatio: undefined,
  objectFit: 'cover',
  eager: false,
});

const loaded = ref(false);
const errored = ref(false);
/** Set once the WebP candidate has failed and we have fallen back to the original. */
const usedFallback = ref(false);

const resolvedSrc = computed(() => resolveMediaUrl(props.src));

/**
 * Everything under /public/images, plus the product photography migrated into
 * backend/uploads/images, ships with a WebP sibling (roughly an eighth of the
 * JPEG's weight). Rather than a <picture> — where a missing source leaves a
 * broken image with no second chance — the WebP is tried as the src and the
 * original takes over in onError, so a one-off admin upload with no sibling
 * just costs a single failed request before falling back cleanly.
 */
const webpSrc = computed(() => {
  const src = props.src ?? '';
  if (!/^\/(images|uploads\/images)\/.+\.(jpe?g|png)$/i.test(src)) return '';
  // /images paths are frontend-hosted and need no resolving, but /uploads/images
  // paths are backend-hosted — resolveMediaUrl is what points those at the API
  // origin in production, same as resolvedSrc does for the JPEG fallback below.
  return resolveMediaUrl(src.replace(/\.(jpe?g|png)$/i, '.webp'));
});

const displaySrc = computed(() =>
  webpSrc.value && !usedFallback.value ? webpSrc.value : resolvedSrc.value,
);

watch(
  () => props.src,
  () => {
    loaded.value = false;
    errored.value = false;
    usedFallback.value = false;
  },
);

function onLoad() {
  loaded.value = true;
}

function onError() {
  if (webpSrc.value && !usedFallback.value) {
    usedFallback.value = true;
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
