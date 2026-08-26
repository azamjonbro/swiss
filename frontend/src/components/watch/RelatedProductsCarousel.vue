<script setup lang="ts">
// Horizontal, swipeable "You may also like" strip. Touch gets native
// momentum scrolling for free; mouse gets a pointer-drag lift, the same
// pattern used elsewhere in the app for horizontal rows (click-suppression
// after a real drag, no edge auto-scroll needed at this length).
import { ref } from 'vue';
import type { Watch } from '@/types/models';
import WatchCard from '@/components/watch/WatchCard.vue';

interface Props {
  watches: Watch[];
}
defineProps<Props>();

const trackEl = ref<HTMLElement | null>(null);
let isDown = false;
let dragDistance = 0;
let startX = 0;
let scrollStart = 0;

function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const track = trackEl.value;
  if (!track) return;

  isDown = true;
  dragDistance = 0;
  startX = event.clientX;
  scrollStart = track.scrollLeft;

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event: PointerEvent) {
  if (!isDown || !trackEl.value) return;
  event.preventDefault();
  const dx = event.clientX - startX;
  dragDistance = Math.max(dragDistance, Math.abs(dx));
  trackEl.value.scrollLeft = scrollStart - dx;
}

function onPointerUp() {
  isDown = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

function onClickCapture(event: MouseEvent) {
  if (dragDistance > 6) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function scrollByCard(direction: 1 | -1) {
  const track = trackEl.value;
  if (!track) return;
  const card = track.querySelector<HTMLElement>('.sw-related__item');
  const step = (card?.offsetWidth ?? 320) + 32;
  track.scrollBy({ left: step * direction, behavior: 'smooth' });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') scrollByCard(1);
  else if (event.key === 'ArrowLeft') scrollByCard(-1);
}
</script>

<template>
  <div class="sw-related">
    <div class="sw-related__nav">
      <button class="sw-related__arrow" type="button" aria-label="Previous" @click="scrollByCard(-1)">&larr;</button>
      <button class="sw-related__arrow" type="button" aria-label="Next" @click="scrollByCard(1)">&rarr;</button>
    </div>

    <div
      ref="trackEl"
      class="sw-related__track"
      tabindex="0"
      role="list"
      @pointerdown="onPointerDown"
      @click.capture="onClickCapture"
      @keydown="onKeydown"
    >
      <div v-for="watch in watches" :key="watch._id" class="sw-related__item" role="listitem">
        <WatchCard :watch="watch" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-related {
  position: relative;
}

.sw-related__track {
  display: flex;
  gap: 32px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  cursor: grab;
  padding-bottom: 4px;
}

.sw-related__track:active {
  cursor: grabbing;
}

.sw-related__track::-webkit-scrollbar {
  display: none;
}

.sw-related__item {
  flex: 0 0 clamp(220px, 24vw, 320px);
  scroll-snap-align: start;
}

@media (max-width: 900px) {
  .sw-related__item {
    flex-basis: clamp(200px, 42vw, 280px);
  }
}

@media (max-width: 560px) {
  .sw-related__item {
    flex-basis: 72vw;
  }
}

.sw-related__nav {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 20px;
}

.sw-related__arrow {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-related__arrow:hover {
  background: var(--bg-inverse);
  color: var(--text-inverse);
  border-color: var(--bg-inverse);
}

@media (max-width: 640px) {
  .sw-related__nav {
    display: none;
  }
}
</style>
