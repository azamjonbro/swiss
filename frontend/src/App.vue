<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useUiStore } from '@/stores/ui';
import { useSavedStore } from '@/stores/saved';

const ui = useUiStore();
// Instantiated once here so its session watcher stays live for the whole app —
// signing in loads the wishlist, signing out clears it.
useSavedStore();

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (ui.isInquiryOpen) ui.closeInquiry();
  else if (ui.isCartOpen) ui.closeCart();
  else if (ui.isSearchOpen) ui.closeSearch();
  else if (ui.isMenuOpen) ui.closeMenu();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <DefaultLayout>
    <router-view v-slot="{ Component, route: r }">
      <transition name="sw-page" mode="out-in">
        <component :is="Component" :key="(r.meta.transitionKey as string) ?? r.path" />
      </transition>
    </router-view>
  </DefaultLayout>
</template>

<style>
/* Route change: the outgoing page settles away, the incoming one rises into
   place. Slow enough to read as a transition, short enough never to be a wait. */
.sw-page-enter-active {
  transition:
    opacity 0.85s var(--ease-editorial) 0.05s,
    transform 0.85s var(--ease-editorial) 0.05s;
}

.sw-page-leave-active {
  transition:
    opacity 0.4s var(--ease-out),
    transform 0.4s var(--ease-out);
}

.sw-page-enter-from {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
}

.sw-page-leave-to {
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}

@media (prefers-reduced-motion: reduce) {
  .sw-page-enter-active,
  .sw-page-leave-active {
    transition: opacity 0.2s linear;
  }

  .sw-page-enter-from,
  .sw-page-leave-to {
    transform: none;
  }
}
</style>
