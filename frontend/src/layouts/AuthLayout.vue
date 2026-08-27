<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale';
import BrandMark from '@/components/shared/BrandMark.vue';

const locale = useLocaleStore();

// One photograph for every authentication screen. Because sign in, sign up and
// the password flows are children of this layout, the panel is never unmounted —
// moving between them changes only the form column.
const authImage = '/images/swisswatch_provenance.jpg';
</script>

<template>
  <div class="sw-auth">
    <aside class="sw-auth__media">
      <img class="sw-auth__media-img" :src="authImage" :alt="locale.t('account.imageAlt')" />
      <div class="sw-auth__media-veil" aria-hidden="true" />
      <div class="sw-auth__media-copy">
        <span class="sw-eyebrow">{{ locale.t('account.brandEyebrow') }}</span>
        <p class="sw-auth__statement">{{ locale.t('account.brandStatement') }}</p>
        <p class="sw-auth__media-note">{{ locale.t('account.brandNote') }}</p>
      </div>
    </aside>

    <section class="sw-auth__panel">
      <div class="sw-auth__panel-inner">
        <!-- The house mark, above the form on every auth screen. Signing in is
             the one place a visitor stops to check whose site they are handing
             a password to, and the column carried no identification at all. -->
        <RouterLink to="/" class="sw-auth__mark" :aria-label="locale.t('account.brandEyebrow')">
          <BrandMark :size="34" :wordmark="false" />
        </RouterLink>

        <RouterView v-slot="{ Component, route }">
          <transition name="sw-auth-swap" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Sign in ↔ sign up: the outgoing form lifts away and the incoming one settles
   in, so the switch reads as one continuous movement beside a fixed image. */
.sw-auth-swap-enter-active {
  transition:
    opacity 0.55s var(--ease-editorial) 0.04s,
    transform 0.55s var(--ease-editorial) 0.04s;
}

.sw-auth-swap-leave-active {
  transition:
    opacity 0.28s var(--ease-out),
    transform 0.28s var(--ease-out);
}

.sw-auth-swap-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.sw-auth-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .sw-auth-swap-enter-active,
  .sw-auth-swap-leave-active {
    transition: opacity 0.2s linear;
  }

  .sw-auth-swap-enter-from,
  .sw-auth-swap-leave-to {
    transform: none;
  }
}
</style>
