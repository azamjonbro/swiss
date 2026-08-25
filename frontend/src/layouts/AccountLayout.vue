<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import { useSavedStore } from '@/stores/saved';

const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();
const saved = useSavedStore();

const links = computed(() => [
  { to: '/account', label: locale.t('account.navOverview'), exact: true },
  { to: '/account/orders', label: locale.t('account.navOrders'), exact: false },
  { to: '/account/saved', label: locale.t('account.navSaved'), exact: false },
  { to: '/account/settings', label: locale.t('account.navSettings'), exact: false },
]);

async function signOut() {
  await account.logout();
  saved.reset();
  router.replace('/account/login');
}
</script>

<template>
  <div class="sw-account sw-container">
    <header class="sw-account__head">
      <div>
        <span class="sw-eyebrow">{{ locale.t('account.dashboardEyebrow') }}</span>
        <h1 class="sw-h2 sw-account__title">{{ account.user?.name }}</h1>
      </div>
      <p class="sw-meta">{{ account.user?.email }}</p>
    </header>

    <div class="sw-account__layout">
      <nav class="sw-account__nav" :aria-label="locale.t('account.dashboardEyebrow')">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          class="sw-account__nav-link"
          :class="{ 'is-active': link.exact ? $route.path === link.to : $route.path.startsWith(link.to) }"
          :to="link.to"
        >
          {{ link.label }}
        </RouterLink>

        <span class="sw-account__nav-sep" aria-hidden="true" />

        <button class="sw-account__nav-link sw-account__nav-link--quiet" type="button" @click="signOut">
          {{ locale.t('account.logOut') }}
        </button>
      </nav>

      <div class="sw-account__body">
        <RouterView v-slot="{ Component, route }">
          <transition name="sw-account-swap" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-account-swap-enter-active {
  transition:
    opacity 0.45s var(--ease-editorial),
    transform 0.45s var(--ease-editorial);
}

.sw-account-swap-leave-active {
  transition: opacity 0.2s var(--ease-out);
}

.sw-account-swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.sw-account-swap-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sw-account-swap-enter-active,
  .sw-account-swap-leave-active {
    transition: opacity 0.15s linear;
  }

  .sw-account-swap-enter-from {
    transform: none;
  }
}
</style>
