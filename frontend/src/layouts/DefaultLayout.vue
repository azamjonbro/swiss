<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { initLenis, destroyLenis, resetScroll } from '@/composables/useLenis';
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
    resetScroll();
    await nextTick();
    ScrollTrigger.refresh();
    // ScrollTrigger.refresh() restores the scroll offset it measured before
    // recalculating trigger positions, and on a route change that measurement
    // can still be the outgoing page's. One more reset, a tick after the
    // navigation, is cheap and settles the page at the top for good.
    resetScroll();
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
  /* Viewport units, not a percentage. `min-height: 100%` resolves against
     #app, which has no height of its own, so the floor silently evaluated to
     zero: on first paint the route component had not loaded yet, <main> was
     empty, and the footer sat just under the header. The moment the page
     rendered it was thrown down the document — one shift worth 0.657 CLS, the
     entire measured score for the site. With a real floor the footer starts at
     the fold and never moves inside the viewport.
     `svh` matches the hero, so the two agree about what a screen is. */
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.sw-app-main {
  flex: 1;
  /* `flex: 1` alone only claims the space left over, and the header is fixed
     (so it takes none) while the footer is ~500px tall — which left an empty
     <main> just 314px high and the whole footer sitting in plain view. Every
     data-driven page then threw it down the document the moment its fetch
     resolved: 0.657 CLS on the product pages, unaffected by the mount fix
     because the route component was ready and its data was not.
     A full screen of floor keeps the footer below the fold, where its later
     movement costs nothing. */
  min-height: 100svh;
}
</style>
