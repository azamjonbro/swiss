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
           the small stone at the crossing. Not drawn by hand: traced from the
           boutique's own logo artwork, so the geometry here is the artwork's,
           to within a fifth of a unit. public/favicon.svg and admin's copy carry
           these same five paths, and public/logo.png / apple-touch-icon.png are
           rasterised from them — change one, change all four, or the tab icon
           and the header mark drift apart. -->
      <path d="M0 0L16.06 0 16.74 16.74 15.2 16.97 1.26 17.6 16.57 18.29 16.86 18.46 16.86 21.14 0 20.46Z" fill="var(--sw-crimson)" />
      <path d="M40 0L40 15.89 23.14 16.57 22.29 1.54 21.66 16.46 21.2 16.69 18.74 16.69 19.43 0Z" fill="var(--sw-crimson)" />
      <path d="M21.43 21.31L18.86 21.31 18.57 21.14 18.69 18.46 21.43 18.51Z" fill="var(--sw-crimson)" />
      <path d="M40 40L24.06 40 23.31 23.03 24.8 22.8 38.46 22.17 23.43 21.49 23.26 21.26 23.2 18.63 40 19.31Z" fill="var(--sw-crimson)" />
      <path d="M0 40L0 23.89 17.03 23.26 17.77 38.51 18.46 23.37 18.69 23.09 21.31 23.09 20.63 40Z" fill="var(--sw-crimson)" />
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
   column is free to grow past what they leave it. Set side by side at this
   width the wordmark ran into the actions — at 375px the Uzbek labels
   ("Qidiruv", "Savat") reached it even with the tracking tightened.

   Stacking is what fixes that rather than hiding the name: the lockup's width
   stops being glyph + gap + 18 tracked characters and becomes just the text,
   which at this size is around 90px — comfortably inside what the flanking
   columns leave even at 320px. The name is worth keeping; it is the half of a
   logo that says who this is. */
@media (max-width: 640px) {
  .sw-mark {
    flex-direction: column;
    gap: 4px;
  }

  .sw-mark__glyph {
    width: 24px;
    height: 24px;
  }

  .sw-mark__word {
    font-size: 0.44rem;
    letter-spacing: 0.16em;
    /* Matches the reduced tracking above, so the trailing letter-space is
       trimmed by exactly what it grew — otherwise the stack sits off-centre
       under the tile. */
    margin-right: -0.16em;
  }
}
</style>
