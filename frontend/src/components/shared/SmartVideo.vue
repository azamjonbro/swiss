<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useInViewport } from '@/composables/useInViewport';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import { resolveMediaUrl } from '@/utils/media';
import SmartImage from '@/components/shared/SmartImage.vue';

type PlaybackStrategy = 'eager' | 'viewport' | 'manual';

interface Props {
  src?: string | null;
  mobileSrc?: string | null;
  poster?: string | null;
  alt?: string;
  loop?: boolean;
  muted?: boolean;
  playbackStrategy?: PlaybackStrategy;
  objectFit?: 'cover' | 'contain';
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  mobileSrc: '',
  poster: '',
  alt: '',
  loop: true,
  muted: true,
  playbackStrategy: 'viewport',
  objectFit: 'cover',
});

const wrapperEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const errored = ref(false);
const isReady = ref(false);
const isPlaying = ref(false);
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768);

const { isVisible } = useInViewport(wrapperEl);

const activeSrc = computed(() => {
  const chosen = isMobile.value && props.mobileSrc ? props.mobileSrc : props.src;
  return resolveMediaUrl(chosen);
});

const shouldRenderVideo = computed(() => Boolean(activeSrc.value) && !errored.value && !prefersReducedMotion());
const showPoster = computed(() => !shouldRenderVideo.value || !isPlaying.value);

function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

async function tryPlay() {
  if (!videoEl.value || errored.value) return;
  try {
    await videoEl.value.play();
    isPlaying.value = true;
  } catch {
    // Autoplay can be blocked by the browser; poster remains visible.
    isPlaying.value = false;
  }
}

function tryPause() {
  videoEl.value?.pause();
  isPlaying.value = false;
}

function onError() {
  errored.value = true;
  isPlaying.value = false;
}

function onCanPlay() {
  isReady.value = true;
  if (props.playbackStrategy === 'eager') tryPlay();
  if (props.playbackStrategy === 'viewport' && isVisible.value) tryPlay();
}

function manualToggle() {
  if (props.playbackStrategy !== 'manual') return;
  isPlaying.value ? tryPause() : tryPlay();
}

watch(isVisible, (visible) => {
  if (props.playbackStrategy !== 'viewport') return;
  if (visible && isReady.value) tryPlay();
  else if (!visible) tryPause();
});

onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

defineExpose({ play: tryPlay, pause: tryPause });
</script>

<template>
  <div ref="wrapperEl" class="sw-smart-video" @click="manualToggle">
    <SmartImage
      v-if="showPoster"
      :src="poster"
      :alt="alt"
      :object-fit="objectFit"
      class="sw-smart-video__poster"
      eager
    />
    <video
      v-if="shouldRenderVideo"
      ref="videoEl"
      class="sw-smart-video__el"
      :class="{ 'is-playing': isPlaying }"
      :src="activeSrc"
      :loop="loop"
      :muted="muted"
      :style="{ objectFit }"
      :autoplay="playbackStrategy !== 'manual'"
      playsinline
      preload="metadata"
      @canplay="onCanPlay"
      @error="onError"
    />
    <button
      v-if="playbackStrategy === 'manual'"
      class="sw-smart-video__control"
      type="button"
      :aria-label="isPlaying ? 'Pause video' : 'Play video'"
    >
      <span v-if="!isPlaying">▶</span>
      <span v-else>❚❚</span>
    </button>
  </div>
</template>

<style scoped>
.sw-smart-video {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--sw-charcoal);
}

.sw-smart-video__poster {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.sw-smart-video__el {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity var(--dur-slow) var(--ease-luxury);
}

.sw-smart-video__el.is-playing {
  opacity: 1;
}

.sw-smart-video__control {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 2;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: var(--sw-white);
  font-size: 0.75rem;
  background: rgba(10, 10, 10, 0.35);
  backdrop-filter: blur(4px);
  transition: background var(--dur-fast) var(--ease-out);
}

.sw-smart-video__control:hover {
  background: rgba(10, 10, 10, 0.6);
}
</style>
