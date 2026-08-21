<script setup lang="ts">
import { ref, computed } from 'vue';
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
const resolvedSrc = computed(() => resolveMediaUrl(props.src));

function onLoad() {
  loaded.value = true;
}
function onError() {
  errored.value = true;
}
</script>

<template>
  <div class="sw-smart-image" :style="aspectRatio ? { aspectRatio } : undefined">
    <div class="sw-smart-image__placeholder" :class="{ 'is-hidden': loaded }" />
    <img
      v-if="resolvedSrc && !errored"
      :src="resolvedSrc"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :decoding="eager ? 'sync' : 'async'"
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
  background: var(--sw-gray-200);
}

.sw-smart-image__placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, var(--sw-gray-200) 0%, var(--sw-ivory) 50%, var(--sw-gray-200) 100%);
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
  background: var(--sw-gray-200);
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
