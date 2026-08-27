<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useThemeStore } from '@/stores/theme';
import { useCurrencyStore, type CurrencyCode } from '@/stores/currency';
import { useAccountStore } from '@/stores/account';
import { useLockBodyScroll } from '@/composables/useLockBodyScroll';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '@/i18n';
import ThemeIcon from '@/components/shared/ThemeIcon.vue';
import PrefDropdown from '@/components/shared/PrefDropdown.vue';
import { site } from '@/utils/seo';

/** The canonical domain, shown bare — derived, never typed out a second time. */
const siteHost = site.url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

const ui = useUiStore();
const locale = useLocaleStore();
const theme = useThemeStore();
const currency = useCurrencyStore();
const account = useAccountStore();
useLockBodyScroll(computed(() => ui.isMenuOpen));

const links = computed(() => [
  { label: locale.t('nav.collections'), to: '/collections', image: '/images/swisswatch_provenance.jpg' },
  { label: locale.t('nav.watches'), to: '/watches', image: '/images/swisswatch_hero.jpg' },
  { label: locale.t('nav.brands'), to: '/brands', image: '/images/swisswatch_network.jpg' },
  { label: locale.t('nav.newArrivals'), to: '/watches?isNew=true', image: '/images/tsarbomba_tb8208.jpg' },
  { label: locale.t('nav.about'), to: '/about', image: '/images/swisswatch_about.jpg' },
  { label: locale.t('nav.contact'), to: '/contact', image: '/images/swisswatch_concierge.jpg' },
]);

// The header hides its Account action on narrow screens, so the menu carries
// the customer account entry point there.
const accountTo = computed(() => (account.isAuthenticated ? '/account' : '/account/login'));

const hoveredTo = ref<string | null>(null);
const activeLink = computed(() => links.value.find((l) => l.to === hoveredTo.value) ?? links.value[0]);

const langOptions = computed(() => SUPPORTED_LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] })));
const currencyOptions = computed(() => currency.SUPPORTED.map((c) => ({ value: c, label: c })));

function setLang(value: string) {
  void locale.setLang(value as Lang);
}

function setCurrency(value: string) {
  currency.setCode(value as CurrencyCode);
}
</script>

<template>
  <transition name="sw-menu">
    <nav v-if="ui.isMenuOpen" class="sw-menu" data-lenis-prevent aria-label="Main navigation" @mouseleave="hoveredTo = null">
      <div class="sw-menu__content">
        <ul class="sw-menu__list">
          <li
            v-for="(link, i) in links"
            :key="link.to"
            class="sw-menu__item"
            :style="{ transitionDelay: `${i * 60}ms` }"
            @mouseenter="hoveredTo = link.to"
          >
            <RouterLink class="sw-menu__link" :to="link.to" @click="ui.closeMenu">{{ link.label }}</RouterLink>
          </li>
        </ul>

        <div class="sw-menu__footer">
          <div class="sw-menu__contact">
            <span class="sw-eyebrow">{{ locale.t('header.account') }}</span>
            <RouterLink class="sw-body sw-menu__social" :to="accountTo" @click="ui.closeMenu">
              {{ account.isAuthenticated ? account.user?.name : locale.t('account.signInLink') }}
            </RouterLink>
          </div>
          <div class="sw-menu__contact">
            <span class="sw-eyebrow">{{ locale.t('menu.visit') }}</span>
            <p class="sw-body">{{ siteHost }}</p>
          </div>
          <div class="sw-menu__contact">
            <span class="sw-eyebrow">{{ locale.t('menu.follow') }}</span>
            <a class="sw-body sw-menu__social" href="https://instagram.com/swisswatch_premium" target="_blank" rel="noopener">
              @swisswatch_premium
            </a>
          </div>
        </div>

        <div class="sw-menu__prefs">
          <div class="sw-menu__pref">
            <span class="sw-eyebrow">{{ locale.t('prefs.theme') }}</span>
            <button class="sw-menu__pref-btn" type="button" @click="theme.toggle">
              <ThemeIcon :mode="theme.mode" :size="13" />
              {{ theme.mode === 'dark' ? locale.t('prefs.dark') : locale.t('prefs.light') }}
            </button>
          </div>
          <div class="sw-menu__pref">
            <span class="sw-eyebrow">{{ locale.t('prefs.language') }}</span>
            <PrefDropdown
              :options="langOptions"
              :model-value="locale.lang"
              :label="locale.t('prefs.language')"
              surface="dark"
              :compact="false"
              @mouseenter="locale.prefetch()"
              @focusin="locale.prefetch()"
              @update:model-value="setLang"
            />
          </div>
          <div class="sw-menu__pref">
            <span class="sw-eyebrow">{{ locale.t('prefs.currency') }}</span>
            <PrefDropdown
              :options="currencyOptions"
              :model-value="currency.code"
              :label="locale.t('prefs.currency')"
              surface="dark"
              :compact="false"
              @update:model-value="setCurrency"
            />
          </div>
        </div>
      </div>

      <div class="sw-menu__visual" aria-hidden="true">
        <transition name="sw-menu-visual-fade" mode="out-in">
          <img :key="activeLink.image" class="sw-menu__visual-img" :src="activeLink.image" alt="" />
        </transition>
        <div class="sw-menu__visual-overlay" />
        <span class="sw-menu__visual-caption">{{ activeLink.label }}</span>
      </div>
    </nav>
  </transition>
</template>

<style scoped>
.sw-menu {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--sw-black);
  color: var(--sw-white);
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  overflow-y: auto;
}

.sw-menu__content {
  display: flex;
  flex-direction: column;
  padding: calc(var(--header-height) + 40px) var(--container-pad) 60px;
}

.sw-menu__visual {
  display: none;
}

@media (min-width: 1080px) {
  .sw-menu {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .sw-menu__content {
    padding-right: clamp(32px, 5vw, 80px);
  }

  .sw-menu__visual {
    display: block;
    position: relative;
    height: 100%;
    overflow: hidden;
    background: var(--sw-charcoal);
  }

  .sw-menu__visual-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sw-menu__visual-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 10, 10, 0.05) 0%, rgba(10, 10, 10, 0.55) 100%);
  }

  .sw-menu__visual-caption {
    position: absolute;
    left: clamp(24px, 3vw, 48px);
    bottom: clamp(24px, 3vw, 48px);
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 1.15rem;
    color: var(--sw-white);
  }

  .sw-menu-visual-fade-enter-active,
  .sw-menu-visual-fade-leave-active {
    transition: opacity 0.5s var(--ease-out), transform 1.4s var(--ease-luxury);
  }

  .sw-menu-visual-fade-enter-from {
    opacity: 0;
    transform: scale(1.06);
  }

  .sw-menu-visual-fade-leave-to {
    opacity: 0;
  }
}

.sw-menu__list {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 2vh, 18px);
}

.sw-menu__item {
  overflow: hidden;
  opacity: 1;
  transform: translateY(0);
}

.sw-menu-enter-active .sw-menu__item {
  transition: opacity 0.6s var(--ease-luxury), transform 0.6s var(--ease-luxury);
}

.sw-menu-enter-from .sw-menu__item {
  opacity: 0;
  transform: translateY(24px);
}

.sw-menu__link {
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 6vw, 4.2rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  transition: opacity var(--dur-fast) var(--ease-out), padding-left var(--dur-fast) var(--ease-out);
  display: inline-block;
}

.sw-menu__link:hover {
  opacity: 0.6;
  padding-left: 12px;
}

.sw-menu__footer {
  display: flex;
  gap: 64px;
  margin-top: 64px;
}

/* The label and its value are both inline elements, so a short value (an
   account link reading just "Kirish") would sit on the label's line. Stack
   them explicitly instead of relying on the value being long enough to wrap. */
.sw-menu__contact {
  display: grid;
  justify-items: start;
}

.sw-menu__contact .sw-eyebrow {
  color: var(--sw-gray-400);
}

.sw-menu__contact .sw-body {
  color: var(--sw-gray-200);
  margin-top: 6px;
}

.sw-menu__social:hover {
  color: var(--sw-white);
}

.sw-menu__prefs {
  display: flex;
  gap: 48px;
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}

.sw-menu__pref {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sw-menu__pref .sw-eyebrow {
  color: var(--sw-gray-400);
}

.sw-menu__pref-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  font-size: 0.9rem;
  color: var(--sw-gray-200);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-menu__pref-btn:hover {
  color: var(--sw-white);
}

.sw-menu__pref :deep(.sw-pref-dd__trigger) {
  color: var(--sw-gray-200);
}

.sw-menu__pref :deep(.sw-pref-dd__trigger:hover) {
  color: var(--sw-white);
  opacity: 1;
}

.sw-menu-enter-active,
.sw-menu-leave-active {
  transition: opacity var(--dur-mid) var(--ease-luxury);
}
.sw-menu-enter-from,
.sw-menu-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .sw-menu__footer {
    flex-direction: column;
    gap: 24px;
  }

  .sw-menu__prefs {
    gap: 28px;
    margin-top: 24px;
    padding-top: 24px;
  }
}
</style>
