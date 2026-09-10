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
           to within a fifth of a unit. public/favicon.svg carries these same
           five paths, and public/favicon.ico, favicon-96x96.png, logo.png and
           apple-touch-icon.png are all rasterised from it — change one, change
           them all, or the tab icon and the header mark drift apart. -->
      <path d="M0 0L16.06 0 16.74 16.74 15.2 16.97 1.26 17.6 16.57 18.29 16.86 18.46 16.86 21.14 0 20.46Z" fill="var(--sw-crimson)" />
      <path d="M40 0L40 15.89 23.14 16.57 22.29 1.54 21.66 16.46 21.2 16.69 18.74 16.69 19.43 0Z" fill="var(--sw-crimson)" />
      <path d="M21.43 21.31L18.86 21.31 18.57 21.14 18.69 18.46 21.43 18.51Z" fill="var(--sw-crimson)" />
      <path d="M40 40L24.06 40 23.31 23.03 24.8 22.8 38.46 22.17 23.43 21.49 23.26 21.26 23.2 18.63 40 19.31Z" fill="var(--sw-crimson)" />
      <path d="M0 40L0 23.89 17.03 23.26 17.77 38.51 18.46 23.37 18.69 23.09 21.31 23.09 20.63 40Z" fill="var(--sw-crimson)" />
    </svg>
    <!--
      One line, at every width. It used to be two spans so the name could be
      stacked on a phone, back when the header still carried the search,
      account and cart labels beside it. Those moved to MobileTabBar, which
      left the centre column with most of the row to itself — so the name is a
      plain string again and the lockup reads the same everywhere.

      The casing here is literal and load-bearing: the wordmark face is subset
      to the letters of this exact string (see index.html), so this is the only
      text on the site that may be set in it.
    -->
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

/* The wordmark is the one place on the site that does not use DM Sans:
   Cormorant Garamond, an old-style face with fine hairlines and a small
   x-height, set in mixed case rather than tracked capitals. Set as capitals it
   read as a generic luxury title and threw away the thing that identifies it,
   so the casing here is part of the mark, not a default.

   The small x-height is why this sits a weight up (600) and a size up from
   what a Didone needed: at the same nominal size Cormorant simply draws
   smaller, and 500 left the hairlines thin enough to grey out on a phone. */
.sw-mark__word {
  font-family: var(--font-wordmark);
  font-weight: 600;
  /* One line at every width, and as large as the row can carry.

     The ceiling is the desktop lockup. The floor is set by the *tablet*, not
     the phone: between 641px and about 1024px the header still carries search,
     account and cart beside the mark, and the centre column is the narrowest
     it ever gets. With the preferences dropped from that band (see
     AppHeader.vue) 1.2rem leaves ~50px of air at 768px; phones get the larger
     size back below, where the actions are gone entirely. */
  font-size: clamp(1.2rem, 1.9vw, 1.95rem);
  letter-spacing: 0.005em;
  line-height: 1;
  white-space: nowrap;
}

/* On a phone the header's own actions are gone — search, account and cart are
   the bottom bar — so the centre column has the row nearly to itself and the
   name holds on one line at a size a person can actually read. The glyph comes
   down to 26px so the lockup still clears the 62px compact header. */
@media (max-width: 640px) {
  .sw-mark {
    gap: 9px;
  }

  .sw-mark__glyph {
    width: 26px;
    height: 26px;
  }

  .sw-mark__word {
    font-size: 1.35rem;
  }
}

/* The narrowest phones still in use: glyph 24px + gap 7px + ~124px of name,
   inside the ~270px the empty flanking columns leave at 320px. */
@media (max-width: 360px) {
  .sw-mark {
    gap: 7px;
  }

  .sw-mark__glyph {
    width: 24px;
    height: 24px;
  }

  .sw-mark__word {
    font-size: 1.2rem;
  }
}

</style>
