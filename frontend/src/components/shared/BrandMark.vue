<script setup lang="ts">
import { useId } from 'vue';

interface Props {
  /** Mark height in px (the tile is square). */
  size?: number;
  /** Render the wordmark next to the tile. */
  wordmark?: boolean;
}

withDefaults(defineProps<Props>(), { size: 30, wordmark: true });

// The tile is rounded by a clip path rather than by the CSS box, so the four
// crimson panels below cannot leak an ivory corner. The mark renders more than
// once per page (header, footer, auth panel), so the id has to be unique per
// instance or the first one on the page would clip all of them.
const clipId = `sw-mark-${useId()}`;
</script>

<template>
  <span class="sw-mark">
    <!--
      The house mark: the boutique's painterly Swiss cross. Not a centred plus
      sign — the tile is cut into four crimson panels by two white channels
      that are drawn, not measured: the vertical one leans right and opens out
      towards the foot, the horizontal one rides high and lifts to the right,
      and a thin crimson wedge splits the head of each stroke the way a second
      pass of a brush would. Built from flat fills only, so it survives from a
      16px favicon to a full-width lockup, in either theme.
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
      <defs>
        <clipPath :id="clipId"><rect width="40" height="40" rx="1.5" /></clipPath>
      </defs>
      <g :clip-path="`url(#${clipId})`">
        <rect width="40" height="40" fill="var(--sw-ivory)" />
        <path d="M0 0H16.3L15.4 16.2L0 18Z" fill="var(--sw-crimson)" />
        <path d="M20.1 0H40V14.6L20.6 16.6Z" fill="var(--sw-crimson)" />
        <path d="M0 21.4L15.2 19.8L16.9 40H0Z" fill="var(--sw-crimson)" />
        <path d="M20.9 17.4L40 17.6V40H21.9Z" fill="var(--sw-crimson)" />
        <path d="M18.4 0H19.8L19.35 13.2Z" fill="var(--sw-crimson)" />
        <path d="M0 18.8L11.2 19.75L0 19.9Z" fill="var(--sw-crimson)" />
      </g>
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
