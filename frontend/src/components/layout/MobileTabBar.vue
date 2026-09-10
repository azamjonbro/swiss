<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import { useCartStore } from '@/stores/cart';

const ui = useUiStore();
const locale = useLocaleStore();
const account = useAccountStore();
const cart = useCartStore();

// Same rule as the header's: /account is the customer's own account, and
// signed out it bounces to the customer sign-in screen via the router guard.
const accountTo = computed(() => (account.isAuthenticated ? '/account' : '/account/login'));

// The menu, the search panel and the cart drawer are all full-screen surfaces
// with their own close affordance. Leaving the bar floating on top of them
// puts a second, contradictory navigation in front of the one the visitor just
// opened — and in the cart's case directly over its checkout button.
const hidden = computed(() => ui.isMenuOpen || ui.isSearchOpen || ui.isCartOpen || ui.isInquiryOpen);
</script>

<template>
  <!--
    Phone-only. The header's three-column row (menu · wordmark · actions) had to
    fit "Qidiruv", "Savat" and the lockup inside 320px, which is what drove the
    tracking down to 0.12em and the wordmark to 7px in the first place. Moving
    the two actions to the foot of the screen gives the header back to the mark,
    and puts the bag and the account where a thumb actually is.

    `nav`, not a row of buttons: it is the site's primary navigation at this
    width, alongside the menu button that stays in the header.
  -->
  <nav
    class="sw-tabbar"
    :class="{ 'is-hidden': hidden }"
    :aria-hidden="hidden"
    :inert="hidden || undefined"
    :aria-label="locale.t('a11y.mobileNav')"
  >
    <!-- First, and a route rather than an overlay: whatever page a visitor has
         reached, this is the way back to the beginning. The header wordmark
         links here too, but a mark is not a labelled control — and at this
         width it is the smallest thing on the screen. -->
    <RouterLink class="sw-tabbar__item" to="/" :aria-label="locale.t('nav.home')" @click="ui.closeMenu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4.25 10.4 12 4.25l7.75 6.15V19a1 1 0 0 1-1 1h-3.5v-5.25h-6.5V20h-3.5a1 1 0 0 1-1-1Z" />
      </svg>
    </RouterLink>

    <button class="sw-tabbar__item" type="button" :aria-label="locale.t('header.search')" @click="ui.openSearch">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6.25" />
        <path d="M15.6 15.6 20 20" />
      </svg>
    </button>

    <RouterLink class="sw-tabbar__item" :to="accountTo" :aria-label="locale.t('header.account')" @click="ui.closeMenu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="8.25" r="3.75" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </svg>
      <!-- A signed-in visitor gets a quiet confirmation rather than a count:
           the icon alone cannot say whether tapping it signs you in or takes
           you to your orders. -->
      <span v-if="account.isAuthenticated" class="sw-tabbar__dot" aria-hidden="true" />
    </RouterLink>

    <button class="sw-tabbar__item" type="button" :aria-label="locale.t('header.cart')" @click="ui.openCart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5.25 7.75h13.5l-1.1 11.1a1.5 1.5 0 0 1-1.5 1.4H7.85a1.5 1.5 0 0 1-1.5-1.4Z" />
        <path d="M9 9.25V6.5a3 3 0 0 1 6 0v2.75" />
      </svg>
      <span v-if="cart.count" class="sw-tabbar__count">{{ cart.count }}</span>
    </button>
  </nav>
</template>

<style scoped>
.sw-tabbar {
  display: none;
}

@media (max-width: 640px) {
  .sw-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    align-items: center;
    /* The bar's own height is the tap targets; the inset is the phone's home
       indicator, which is not padding the design chose and must not be part of
       the touch area. */
    height: var(--tabbar-height);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-sizing: content-box;
    background: var(--bg-veil);
    backdrop-filter: blur(18px) saturate(120%);
    -webkit-backdrop-filter: blur(18px) saturate(120%);
    border-top: 1px solid var(--hairline);
    color: var(--text);
    transition:
      transform 0.45s var(--ease-editorial),
      opacity 0.3s var(--ease-editorial);
  }

  /* Translated rather than unmounted: the cart drawer closes with an animation
     of its own, and a bar that reappears instantly underneath it reads as a
     glitch. `inert` above is what actually takes it out of the tab order. */
  .sw-tabbar.is-hidden {
    transform: translateY(100%);
    opacity: 0;
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .sw-tabbar {
      background: var(--bg);
    }
  }

  .sw-tabbar__item {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: inherit;
    opacity: 0.72;
    transition: opacity var(--dur-fast) var(--ease-out);
    -webkit-tap-highlight-color: transparent;
  }

  .sw-tabbar__item svg {
    width: 23px;
    height: 23px;
  }

  /* `router-link-exact-active`, not `router-link-active`: "/" is a prefix of
     every path on the site, so the loose class would light the home icon up on
     every page and tell the visitor they are already there. */
  .sw-tabbar__item:active,
  .sw-tabbar__item:focus-visible,
  .sw-tabbar__item.router-link-exact-active {
    opacity: 1;
  }

  /* Anchored to the icon box, not the cell: centred on the cell it drifted away
     from the bag as the columns widened. */
  .sw-tabbar__count,
  .sw-tabbar__dot {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: -18px 0 0 4px;
  }

  .sw-tabbar__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border-radius: 50%;
    background: var(--sw-crimson);
    color: var(--sw-white);
    font-size: 0.55rem;
    line-height: 1;
  }

  .sw-tabbar__dot {
    width: 5px;
    height: 5px;
    margin-left: 7px;
    border-radius: 50%;
    background: var(--sw-crimson);
  }

  @media (prefers-reduced-motion: reduce) {
    .sw-tabbar {
      transition: opacity var(--dur-fast) linear;
    }

    .sw-tabbar.is-hidden {
      transform: none;
    }
  }
}
</style>
