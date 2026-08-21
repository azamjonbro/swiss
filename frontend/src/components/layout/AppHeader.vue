<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import PreferencesBar from '@/components/shared/PreferencesBar.vue';

const route = useRoute();
const ui = useUiStore();
const locale = useLocaleStore();

const adminUrl = import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:5175';

const scrolled = ref(false);

function onScroll() {
  scrolled.value = window.scrollY > 60;
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));

const themeMode = computed<'transparent' | 'light'>(() => {
  // The full-screen menu is an opaque dark overlay sitting behind the header,
  // so the header blends in (transparent + white text) rather than showing
  // as a separate light bar on top of it.
  if (ui.isMenuOpen) return 'transparent';
  const meta = (route.meta.headerTheme as string) ?? 'light';
  if (meta === 'transparent' && !scrolled.value && !ui.isSearchOpen) return 'transparent';
  return 'light';
});
</script>

<template>
  <header class="sw-header" :class="[`is-${themeMode}`, { 'is-open': ui.isMenuOpen || ui.isSearchOpen }]">
    <div class="sw-header__inner">
      <button class="sw-header__menu-btn" type="button" @click="ui.toggleMenu">
        <span class="sw-header__menu-label">{{ ui.isMenuOpen ? locale.t('header.close') : locale.t('header.menu') }}</span>
      </button>

      <RouterLink to="/" class="sw-header__logo" aria-label="SwissWatch home" @click="ui.closeMenu">
        <span class="sw-header__logo-mark">S</span>
        <span class="sw-header__logo-text">SwissWatch</span>
      </RouterLink>

      <div class="sw-header__actions">
        <PreferencesBar class="sw-header__action--hide-mobile" />
        <span class="sw-header__action-divider sw-header__action--hide-mobile" aria-hidden="true" />
        <button class="sw-header__action" type="button" :aria-label="locale.t('header.search')" @click="ui.openSearch">
          {{ locale.t('header.search') }}
        </button>
        <a class="sw-header__action sw-header__action--hide-mobile" :href="adminUrl" target="_blank" rel="noopener" :aria-label="locale.t('header.account')">
          {{ locale.t('header.account') }}
        </a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.sw-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--header-height);
  transition: background var(--dur-mid) var(--ease-luxury), color var(--dur-mid) var(--ease-luxury),
    border-color var(--dur-mid) var(--ease-luxury);
  border-bottom: 1px solid transparent;
}

.sw-header.is-transparent {
  background: transparent;
  color: var(--sw-white);
}

.sw-header.is-light {
  background: var(--bg);
  color: var(--text);
  border-bottom-color: var(--border);
}

.sw-header__inner {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 var(--container-pad);
}

.sw-header__menu-btn {
  justify-self: start;
}

.sw-header__menu-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.sw-header__logo {
  justify-self: center;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.sw-header__logo-mark {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  color: var(--accent);
}

.sw-header__logo-text {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  letter-spacing: 0.03em;
}

.sw-header__actions {
  justify-self: end;
  display: flex;
  gap: 28px;
}

.sw-header__action {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-header__action:hover {
  opacity: 0.6;
}

.sw-header__action-divider {
  width: 1px;
  height: 12px;
  background: currentColor;
  opacity: 0.22;
}

@media (max-width: 640px) {
  .sw-header__action--hide-mobile {
    display: none;
  }

  .sw-header__inner {
    padding: 0 20px;
  }

  .sw-header__logo-text {
    font-size: 1.1rem;
  }
}
</style>
