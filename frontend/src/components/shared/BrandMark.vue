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
      The house mark, traced from the boutique's own logo (the one on the
      shopfront): not a centred plus sign but four crimson panels cut apart by
      two hand-drawn channels — the upright leaning, the bar riding a little
      high and lifting to the right, thin slivers of crimson left where the
      brush passed twice, and the small stone where the two strokes cross.
      Flat fills only, so it holds from a 16px favicon to a full-width lockup.
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
      <rect width="40" height="40" fill="var(--sw-ivory)" />
      <!-- Four crimson panels, the brush slivers that split the channels, and
           the small centre stone: traced from the boutique's own logo. -->
      <path d="M0 23.81L1.88 23.81L1.88 23.33L16.47 23.33L16.94 24.76L17.41 24.76L17.41 30.95L17.88 30.95L17.88 29.52L18.35 29.52L18.35 24.29L18.82 24.29L19.29 22.86L20.71 22.86L21.18 23.33L21.18 37.62L20.24 38.57L20.24 40L0 40Z" fill="var(--sw-crimson)" />
      <path d="M23.06 19.05L23.53 18.57L32.94 18.57L32.94 19.05L38.59 19.05L40 20L40 40L24.94 40L23.53 38.57L23.53 22.86L24 22.38L32.94 22.38L32.94 21.9L23.53 21.43L23.06 20.95Z" fill="var(--sw-crimson)" />
      <path d="M0 0L16.47 0L16.94 16.19L15.53 16.67L15.53 17.14L10.35 17.14L10.35 17.62L15.53 18.1L15.53 18.57L16.94 19.05L16.94 20.48L16 20.48L16 20.95L2.35 20.95L2.35 20.48L0 20.48Z" fill="var(--sw-crimson)" />
      <path d="M18.82 6.19L19.29 6.19L19.29 0L40 0L40 15.71L37.65 15.71L37.65 16.19L28.24 16.19L28.24 16.67L25.88 16.19L25.88 16.67L23.53 16.67L23.53 16.19L22.59 16.19L22.59 7.14L22.12 7.14L22.12 15.71L21.18 16.67L19.29 16.67L18.82 16.19Z" fill="var(--sw-crimson)" />
      <path d="M18.35 19.05L18.82 18.57L20.71 18.57L21.65 19.52L21.65 20.48L20.71 21.43L19.76 21.43L19.76 20.95L18.35 20.48Z" fill="var(--sw-crimson)" />
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
