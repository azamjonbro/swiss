<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Category } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import CategoryCard from '@/components/category/CategoryCard.vue';

interface Props {
  categories: Category[];
}

defineProps<Props>();
const locale = useLocaleStore();

const sectionEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const EDGE_ZONE = 90; // px from the track's edge that triggers auto-scroll
const EDGE_SPEED_MAX = 18; // px per frame at the very edge

let isDown = false;
let dragDistance = 0;
let startX = 0;
let scrollStart = 0;
let pointerX = 0;
let autoScrollRAF: number | null = null;

function stopAutoScroll() {
  if (autoScrollRAF !== null) {
    cancelAnimationFrame(autoScrollRAF);
    autoScrollRAF = null;
  }
}

function autoScrollStep() {
  const track = trackEl.value;
  if (!track) {
    autoScrollRAF = null;
    return;
  }

  const rect = track.getBoundingClientRect();
  if (pointerX > rect.right - EDGE_ZONE) {
    const intensity = Math.min(1, (pointerX - (rect.right - EDGE_ZONE)) / EDGE_ZONE);
    track.scrollLeft += 2 + intensity * EDGE_SPEED_MAX;
  } else if (pointerX < rect.left + EDGE_ZONE) {
    const intensity = Math.min(1, (rect.left + EDGE_ZONE - pointerX) / EDGE_ZONE);
    track.scrollLeft -= 2 + intensity * EDGE_SPEED_MAX;
  }

  autoScrollRAF = requestAnimationFrame(autoScrollStep);
}

function onPointerDown(event: PointerEvent) {
  // Only hijack mouse drags — touch already gets native horizontal swipe scrolling.
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const track = trackEl.value;
  if (!track) return;

  isDown = true;
  dragDistance = 0;
  startX = event.clientX;
  pointerX = event.clientX;
  scrollStart = track.scrollLeft;
  isDragging.value = true;

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  if (autoScrollRAF === null) autoScrollRAF = requestAnimationFrame(autoScrollStep);
}

function onPointerMove(event: PointerEvent) {
  pointerX = event.clientX;
  if (!isDown || !trackEl.value) return;

  event.preventDefault();
  const dx = event.clientX - startX;
  dragDistance = Math.max(dragDistance, Math.abs(dx));
  trackEl.value.scrollLeft = scrollStart - dx;
}

function onPointerUp() {
  isDown = false;
  isDragging.value = false;
  stopAutoScroll();
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

function onClickCapture(event: MouseEvent) {
  // A card link click that ends a real drag (not a plain click) shouldn't navigate.
  if (dragDistance > 6) {
    event.preventDefault();
    event.stopPropagation();
  }
}

let mm: gsap.MatchMedia | undefined;

onMounted(() => {
  mm = gsap.matchMedia();

  // Ties the page's vertical scroll to this row's horizontal position while it's
  // in view: scrolling down drives the track rightward, and once the track runs
  // out, the pin releases and normal vertical scrolling continues.
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    if (!sectionEl.value || !trackEl.value) return;
    const track = trackEl.value;
    const maxScroll = () => track.scrollWidth - track.clientWidth;

    const st = ScrollTrigger.create({
      trigger: sectionEl.value,
      start: 'top top',
      end: () => `+=${maxScroll()}`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (isDown) return; // a manual drag is in control — don't fight it
        track.scrollLeft = self.progress * maxScroll();
      },
    });

    return () => st.kill();
  });
});

onUnmounted(() => {
  mm?.revert();
  stopAutoScroll();
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <section ref="sectionEl" class="sw-hcat">
    <div class="sw-hcat__header">
      <span class="sw-eyebrow">{{ locale.t('category.eyebrow') }}</span>
      <h2 class="sw-h2">{{ locale.t('category.title') }}</h2>
    </div>

    <div
      ref="trackEl"
      class="sw-hcat__track"
      :class="{ 'is-dragging': isDragging }"
      @pointerdown="onPointerDown"
      @click.capture="onClickCapture"
    >
      <CategoryCard v-for="category in categories" :key="category._id" :category="category" />
      <CategoryCard variant="view-all" />
    </div>
  </section>
</template>

<style scoped>
.sw-hcat {
  padding: clamp(64px, 8vw, 120px) 0;
}

.sw-hcat__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: clamp(32px, 4vw, 48px);
  padding: 0 var(--container-pad);
}

.sw-hcat__track {
  display: flex;
  gap: clamp(16px, 2vw, 24px);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  padding: 0 var(--container-pad) 8px;
  scrollbar-width: thin;
  cursor: grab;
}

.sw-hcat__track.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  user-select: none;
}

.sw-hcat__track.is-dragging :deep(a) {
  pointer-events: none;
}

.sw-hcat__track::-webkit-scrollbar {
  height: 6px;
}
</style>
