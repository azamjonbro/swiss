<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { gsap } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';

const cursorEl = ref<HTMLElement | null>(null);
const label = ref('');
const isActive = ref(false);
const isEnabled = ref(false);

let quickX: ((value: number) => void) | null = null;
let quickY: ((value: number) => void) | null = null;

function onMouseMove(event: MouseEvent) {
  quickX?.(event.clientX);
  quickY?.(event.clientY);
}

function onMouseOver(event: MouseEvent) {
  const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-cursor]');
  if (target) {
    label.value = target.dataset.cursor ?? '';
    isActive.value = true;
  }
}

function onMouseOut(event: MouseEvent) {
  const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-cursor]');
  if (target) isActive.value = false;
}

onMounted(async () => {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover || prefersReducedMotion()) return;

  isEnabled.value = true;
  await nextTick();
  if (!cursorEl.value) return;

  quickX = gsap.quickTo(cursorEl.value, 'x', { duration: 0.5, ease: 'power3.out' });
  quickY = gsap.quickTo(cursorEl.value, 'y', { duration: 0.5, ease: 'power3.out' });

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseover', onMouseOver);
  window.addEventListener('mouseout', onMouseOut);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseover', onMouseOver);
  window.removeEventListener('mouseout', onMouseOut);
});
</script>

<template>
  <div v-if="isEnabled" ref="cursorEl" class="sw-cursor" :class="{ 'is-active': isActive }" aria-hidden="true">
    <span class="sw-cursor__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.sw-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  width: 64px;
  height: 64px;
  margin-left: -32px;
  margin-top: -32px;
  border-radius: 50%;
  background: var(--sw-black);
  color: var(--sw-white);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  mix-blend-mode: difference;
}

.sw-cursor.is-active {
  opacity: 1;
  transform: scale(1);
}

.sw-cursor__label {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
