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
  /* The bar states a fact about the page; it is not a control. Letting clicks
     through keeps it from stealing taps meant for the footer beneath it. */
  pointer-events: none;
}

.sw-testmode__inner {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  max-width: var(--container-max, 1440px);
  margin: 0 auto;
}

.sw-testmode__dot {
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sw-crimson);
  flex: none;
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
