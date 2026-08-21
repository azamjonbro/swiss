<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (ui.isInquiryOpen) ui.closeInquiry();
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
        <component :is="Component" :key="r.path" />
      </transition>
    </router-view>
  </DefaultLayout>
</template>

<style>
.sw-page-enter-active {
  transition: opacity 0.6s var(--ease-luxury), transform 0.6s var(--ease-luxury);
}
.sw-page-leave-active {
  transition: opacity 0.35s var(--ease-out);
}
.sw-page-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.sw-page-leave-to {
  opacity: 0;
}
</style>
