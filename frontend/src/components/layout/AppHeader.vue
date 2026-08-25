<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import PreferencesBar from '@/components/shared/PreferencesBar.vue';
import BrandMark from '@/components/shared/BrandMark.vue';

const route = useRoute();
const ui = useUiStore();
const locale = useLocaleStore();
const account = useAccountStore();

// "Account" is the customer's account, never the admin panel — the admin app is
// a separate deployment reached at its own URL and is not linked from the store.
// Signed out, /account bounces to the customer sign-in screen via the guard.
const accountTo = computed(() => (account.isAuthenticated ? '/account' : '/account/login'));

const scrolled = ref(false);
const pastHero = ref(false);
let ticking = false;

function readScroll() {
  const y = window.scrollY;
  scrolled.value = y > 24;
  // Once the hero imagery is essentially behind us the header stops borrowing
  // the photograph's darkness and starts borrowing the page's own surface.
  pastHero.value = y > window.innerHeight * 0.82;
  ticking = false;
}

function onScroll() {
  // Coalesce to one read per frame — Lenis emits scroll far more often than
  // the header needs to change state.
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(readScroll);
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  readScroll();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));

// three states:
//   transparent — sitting over the top of the hero, untouched
//   veil        — scrolled, still over dark hero imagery: a dark translucent film
//   light       — past the hero, or on an interior page: the page's own surface,
//                 translucent rather than a solid bar
const themeMode = computed<'transparent' | 'veil' | 'light'>(() => {
  // The full-screen menu is an opaque dark overlay sitting behind the header,
  // so the header blends in (transparent + white text) rather than showing
  // as a separate light bar on top of it.
  if (ui.isMenuOpen) return 'transparent';
  const meta = (route.meta.headerTheme as string) ?? 'light';
  if (meta !== 'transparent' || ui.isSearchOpen) return 'light';
  if (!scrolled.value) return 'transparent';
  return pastHero.value ? 'light' : 'veil';
});
</script>

<template>
  <header
    class="sw-header"
    :class="[`is-${themeMode}`, { 'is-compact': scrolled, 'is-open': ui.isMenuOpen || ui.isSearchOpen }]"
  >
    <div class="sw-header__inner">
      <button
        class="sw-header__menu-btn"
        type="button"
        :aria-expanded="ui.isMenuOpen"
        :aria-label="ui.isMenuOpen ? locale.t('header.close') : locale.t('header.menu')"
        @click="ui.toggleMenu"
      >
        <span class="sw-header__menu-rule" aria-hidden="true" />
        <span class="sw-header__menu-label">{{ ui.isMenuOpen ? locale.t('header.close') : locale.t('header.menu') }}</span>
      </button>

      <RouterLink to="/" class="sw-header__logo" aria-label="SwissWatch" @click="ui.closeMenu">
        <BrandMark :size="30" />
      </RouterLink>

      <div class="sw-header__actions">
        <PreferencesBar class="sw-header__action--hide-mobile" />
        <span class="sw-header__action-divider sw-header__action--hide-mobile" aria-hidden="true" />
        <button class="sw-header__action" type="button" @click="ui.openSearch">
          {{ locale.t('header.search') }}
        </button>
        <RouterLink class="sw-header__action sw-header__action--hide-mobile" :to="accountTo" @click="ui.closeMenu">
          {{ locale.t('header.account') }}
        </RouterLink>
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
  border-bottom: 1px solid transparent;
  transition:
    height 0.8s var(--ease-editorial),
    background-color 0.8s var(--ease-editorial),
    color 0.8s var(--ease-editorial),
    border-color 0.8s var(--ease-editorial),
    backdrop-filter 0.8s var(--ease-editorial);
}

.sw-header.is-compact {
  height: 68px;
}

.sw-header.is-transparent {
  background-color: transparent;
  color: var(--sw-white);
}

/* Scrolled over the hero: just enough veil to hold small type, never a
   solid black bar. */
.sw-header.is-veil {
  background-color: rgba(10, 10, 10, 0.42);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  color: var(--sw-white);
  border-bottom-color: rgba(253, 252, 250, 0.1);
}

/* Never a solid panel: the page surface at 76% with a blur behind it, so the
   content scrolling under the header stays faintly present. */
.sw-header.is-light {
  background-color: var(--bg-veil);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  color: var(--text);
  border-bottom-color: var(--hairline);
}

/* Where the blur is unavailable the translucency would let text collide with
   the content behind it, so fall back to the opaque surface. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .sw-header.is-light {
    background-color: var(--bg);
  }

  .sw-header.is-veil {
    background-color: rgba(10, 10, 10, 0.82);
  }
}

.sw-header__inner {
  height: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 var(--container-pad);
}

.sw-header__menu-btn {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

/* A 20px hairline standing in for a burger icon — the quietest possible
   affordance. */
.sw-header__menu-rule {
  width: 20px;
  height: 1px;
  background: currentColor;
  opacity: 0.55;
  transition: width 0.6s var(--ease-editorial), opacity 0.6s var(--ease-editorial);
}

.sw-header__menu-btn:hover .sw-header__menu-rule,
.sw-header__menu-btn:focus-visible .sw-header__menu-rule {
  width: 28px;
  opacity: 1;
}

.sw-header__menu-label,
.sw-header__action {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.sw-header__logo {
  justify-self: center;
}

.sw-header__actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 22px;
}

.sw-header__action {
  transition: opacity var(--dur-fast) var(--ease-out);
  opacity: 0.82;
}

.sw-header__action:hover,
.sw-header__action:focus-visible {
  opacity: 1;
}

.sw-header__action-divider {
  width: 1px;
  height: 10px;
  background: currentColor;
  opacity: 0.2;
}

@media (max-width: 640px) {
  .sw-header__action--hide-mobile {
    display: none;
  }

  .sw-header,
  .sw-header.is-compact {
    height: 62px;
  }

  .sw-header__menu-label {
    display: none;
  }

  .sw-header__menu-rule {
    width: 22px;
  }

  .sw-header__actions {
    gap: 18px;
  }
}
</style>
