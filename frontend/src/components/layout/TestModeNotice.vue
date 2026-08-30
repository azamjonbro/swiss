<script setup lang="ts">
/**
 * A standing notice that the catalogue is not finished and its prices are not
 * final.
 *
 * It sits at the bottom rather than above the header on purpose: the header is
 * fixed and every page pads itself by `--header-height`, so a strip inserted
 * above it would shift the whole site and break the hero's full-screen
 * measurement. A bottom strip disturbs no layout, and the shell reserves its
 * height so it never permanently covers the end of the footer.
 *
 * Not dismissible. It is a statement about the accuracy of prices on the page,
 * so it has to still be there on the page where a price is read.
 *
 * It moves, because a strip that never changes stops being read after the
 * first visit. Three quiet signals rather than one loud one: it rises into
 * place a beat after the page settles, the crimson dot keeps a slow pulse,
 * and a faint sheen crosses the bar every few seconds. All of it stops under
 * prefers-reduced-motion, where the bar simply sits there.
 */
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();
</script>

<template>
  <aside class="sw-testmode" role="note" :aria-label="locale.t('testMode.label')">
    <span class="sw-testmode__inner">
      <span class="sw-testmode__dot" aria-hidden="true" />
      <span class="sw-testmode__label">{{ locale.t('testMode.label') }}</span>
      <span class="sw-testmode__note">{{ locale.t('testMode.note') }}</span>
    </span>
  </aside>
</template>

<style scoped>
.sw-testmode {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* Under the menu, search, cart and modals, above ordinary page content. */
  z-index: 95;
  background: var(--sw-charcoal);
  color: var(--sw-ivory);
  border-top: 1px solid rgba(253, 252, 250, 0.14);
  padding: 9px var(--container-pad);
  overflow: hidden;
  animation: sw-testmode-rise 0.7s var(--ease-editorial) 0.9s both;
  /* The bar states a fact about the page; it is not a control. Letting clicks
     through keeps it from stealing taps meant for the footer beneath it. */
  pointer-events: none;
}

.sw-testmode__inner {
  position: relative;
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  max-width: var(--container-max, 1440px);
  margin: 0 auto;
}

.sw-testmode__dot {
  position: relative;
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sw-crimson);
  flex: none;
  animation: sw-testmode-pulse 2.4s ease-in-out infinite;
}

/* The halo is a separate ring so the dot itself keeps its exact size and the
   glow can grow past it without nudging the baseline of the text beside it. */
.sw-testmode__dot::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid var(--sw-crimson);
  animation: sw-testmode-halo 2.4s ease-out infinite;
}

/* A slow highlight travelling the width of the bar. Sits under the text and
   ignores pointer events, so it can never interfere with what is beneath. */
.sw-testmode::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 38%,
    rgba(173, 43, 57, 0.22) 50%,
    transparent 62%
  );
  transform: translate3d(-100%, 0, 0);
  animation: sw-testmode-sheen 7s var(--ease-editorial) 2s infinite;
  pointer-events: none;
}

@keyframes sw-testmode-rise {
  from { transform: translate3d(0, 100%, 0); }
  to   { transform: translate3d(0, 0, 0); }
}

@keyframes sw-testmode-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

@keyframes sw-testmode-halo {
  0%   { transform: scale(0.7); opacity: 0.9; }
  70%  { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
}

@keyframes sw-testmode-sheen {
  0%        { transform: translate3d(-100%, 0, 0); }
  55%, 100% { transform: translate3d(100%, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .sw-testmode,
  .sw-testmode__dot,
  .sw-testmode__dot::after,
  .sw-testmode::before {
    animation: none;
  }

  .sw-testmode::before {
    display: none;
  }
}

.sw-testmode__label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sw-crimson);
  white-space: nowrap;
}

.sw-testmode__note {
  font-family: var(--font-sans);
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(243, 239, 231, 0.82);
  text-align: center;
}

@media (max-width: 720px) {
  .sw-testmode {
    padding: 8px 16px;
  }

  .sw-testmode__note {
    font-size: 11.5px;
  }
}
</style>
