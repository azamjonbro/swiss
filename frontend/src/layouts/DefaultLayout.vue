<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { initLenis, destroyLenis, scrollTo } from '@/composables/useLenis';
import { ScrollTrigger } from '@/animations/gsap';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import LuxuryMenu from '@/components/layout/LuxuryMenu.vue';
import SearchOverlay from '@/components/search/SearchOverlay.vue';
import InquiryModal from '@/components/shared/InquiryModal.vue';
import CartDrawer from '@/components/shared/CartDrawer.vue';

const route = useRoute();
const locale = useLocaleStore();

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
    <a class="sw-skip-link" href="#sw-main">{{ locale.t('a11y.skipToContent') }}</a>
    <AppHeader />
    <LuxuryMenu />
    <SearchOverlay />
    <InquiryModal />
    <CartDrawer />
    <main id="sw-main" class="sw-app-main" tabindex="-1">
      <slot />
    </main>
    <!-- The authentication screens are full-viewport compositions; the footer
         would break their frame, so those routes opt out of it. -->
    <AppFooter v-if="!route.meta.hideFooter" />
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
