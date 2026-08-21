<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { initLenis, destroyLenis, scrollTo } from '@/composables/useLenis';
import { ScrollTrigger } from '@/animations/gsap';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import LuxuryMenu from '@/components/layout/LuxuryMenu.vue';
import SearchOverlay from '@/components/search/SearchOverlay.vue';
import InquiryModal from '@/components/shared/InquiryModal.vue';
import CustomCursor from '@/components/shared/CustomCursor.vue';

const route = useRoute();

onMounted(() => {
  initLenis();
});

onUnmounted(() => {
  destroyLenis();
});

watch(
  () => route.path,
  async () => {
    scrollTo(0, { immediate: true });
    await nextTick();
    ScrollTrigger.refresh();
  },
);
</script>

<template>
  <div class="sw-app-shell">
    <AppHeader />
    <LuxuryMenu />
    <SearchOverlay />
    <InquiryModal />
    <CustomCursor />
    <main class="sw-app-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.sw-app-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.sw-app-main {
  flex: 1;
}
</style>
