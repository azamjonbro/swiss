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
      Two spans, not one string with a space in it. The lockup has to hold as a
      single line on a desktop header and as two stacked lines on a phone, and
      the browser will not be told *where* to break a plain string — left to
      itself it broke "SwissWatch / Premium" one width and "SwissWatch Pre- /
      mium" the next. Splitting the name is what makes the break point the
      design's decision rather than the text renderer's; the accessible name is
      the same two words either way.
    -->
    <span v-if="wordmark" class="sw-mark__word">
      <span class="sw-mark__word-line">SwissWatch</span>
      <span class="sw-mark__word-line">Premium</span>
    </span>
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

/* One line on a wide header: the two spans sit inline, and this is the space
   between them that the markup deliberately does not contain. */
.sw-mark__word-line + .sw-mark__word-line::before {
  content: ' ';
}

/* The header centres this lockup between two flanking columns, and the centre
   column is free to grow past what they leave it. Set on one line at the
   desktop size the wordmark ran into the actions — at 375px the Uzbek labels
   ("Qidiruv", "Savat") reached it even with the tracking tightened.

   What used to give here was the lockup itself: the glyph moved *above* the
   name and the name shrank to 0.44rem — around 7px — to fit under a 24px tile.
   At that size it is a grey smear, not a wordmark, and the mark no longer
   reads as one lockup. Breaking the name over two lines *beside* the glyph
   costs the same width (the widest line is "SWISSWATCH", not the whole name)
   and buys back enough of it to keep the type at a size that can actually be
   read: glyph 26px + gap + ~80px of text, inside what the flanking columns
   leave even at 320px. */
@media (max-width: 640px) {
  .sw-mark {
    gap: 9px;
  }

  .sw-mark__glyph {
    width: 26px;
    height: 26px;
  }

  .sw-mark__word {
    /* Stacked, but still the row's second column — the glyph stays alongside. */
    display: flex;
    flex-direction: column;
    font-size: 0.5625rem;
    letter-spacing: 0.2em;
    line-height: 1.35;
    /* Matches the reduced tracking above, so the trailing letter-space is
       trimmed by exactly what it grew. */
    margin-right: -0.2em;
  }

  /* The inline space belongs to the one-line lockup only; between two flex
     items it would open a phantom gap at the head of the second line. */
  .sw-mark__word-line + .sw-mark__word-line::before {
    content: none;
  }
}

/* The narrowest phones still in use. Measured with the Uzbek labels, which are
   the widest the actions column ever gets ("Qidiruv · Savat", 87px at this
   breakpoint's tightened tracking). */
@media (max-width: 360px) {
  .sw-mark {
    gap: 7px;
  }

  .sw-mark__glyph {
    width: 24px;
    height: 24px;
  }

  .sw-mark__word {
    font-size: 0.5rem;
    letter-spacing: 0.14em;
    margin-right: -0.14em;
  }
}

</style>
