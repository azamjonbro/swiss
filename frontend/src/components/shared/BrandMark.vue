<script setup lang="ts">
interface Props {
  /** Mark height in px (the tile is square). */
  size?: number;
  /** Render the wordmark next to the tile. */
  wordmark?: boolean;
}

withDefaults(defineProps<Props>(), { size: 30, wordmark: true });
</script>

<template>
  <span class="sw-mark">
    <!--
      The house mark: a painterly Swiss cross on a crimson tile, lifted from the
      boutique logo. Two ivory bars over two deeper-red under-strokes give the
      hand-painted layering; it is built from three flat fills so it stays clean
      from 16px (favicon) to full width, in either theme.
    -->
    <svg
      class="sw-mark__glyph"
      :width="size"
      :height="size"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="2" fill="var(--sw-crimson)" />
      <rect x="23" y="6" width="3" height="28" rx="0.6" fill="var(--sw-crimson-deep)" />
      <rect x="7.5" y="22" width="26" height="3" rx="0.6" fill="var(--sw-crimson-deep)" />
      <rect x="16" y="5" width="7" height="30" rx="1" fill="var(--sw-ivory)" />
      <rect x="5.5" y="15" width="28" height="7" rx="1" fill="var(--sw-ivory)" />
    </svg>
    <span v-if="wordmark" class="sw-mark__word">SwissWatch Premium</span>
  </span>
</template>

<style scoped>
.sw-mark {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
}

.sw-mark__glyph {
  flex: none;
  border-radius: 2px;
}

.sw-mark__word {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 1.0625rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  /* The tracking adds trailing space after the final letter; pull it back so
     the lockup stays optically centred. */
  margin-right: -0.3em;
}

/* The header centres this lockup between two flanking columns, and the centre
   column is free to grow past what they leave it. Tightening the tracking was
   not enough — at 375px the Uzbek actions ("Qidiruv", "Savat") still ran into
   the wordmark. Below the breakpoint that already strips the menu label and
   the secondary actions, the tile stands alone: it is the logo, the name is
   in the title, the hero and the footer, and this is the one arrangement that
   cannot be broken by a longer locale string. */
@media (max-width: 640px) {
  .sw-mark__glyph {
    width: 28px;
    height: 28px;
  }

  .sw-mark__word {
    display: none;
  }
}
</style>
