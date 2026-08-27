<script setup lang="ts">
interface Props {
  /** Mark diameter in px. */
  size?: number;
  /** Render the wordmark next to the monogram. */
  wordmark?: boolean;
}

withDefaults(defineProps<Props>(), { size: 30, wordmark: true });
</script>

<template>
  <span class="sw-mark">
    <!--
      The monogram reads as a dial: a hairline bezel, a single burgundy index at
      twelve, and the serif S at the centre. No fills, no gradients — it holds
      up at 16px and at 200px, in either theme, because it is built from
      currentColor and one accent stroke.
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
      <circle cx="20" cy="20" r="19" stroke="currentColor" stroke-opacity="0.32" stroke-width="1" />
      <line x1="20" y1="1.6" x2="20" y2="5.4" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="butt" />
      <text
        class="sw-mark__letter"
        x="20"
        y="20"
        text-anchor="middle"
        dominant-baseline="central"
        fill="currentColor"
      >
        S
      </text>
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
  overflow: visible;
}

.sw-mark__letter {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 400;
  letter-spacing: 0.02em;
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

/* The header centres this lockup between two flanking columns; at phone widths
   the full tracking makes it wide enough to collide with the actions on the
   right, so the mark and the tracking both come in. */
@media (max-width: 640px) {
  .sw-mark {
    gap: 9px;
  }

  .sw-mark__glyph {
    width: 25px;
    height: 25px;
  }

  .sw-mark__word {
    font-size: 0.8125rem;
    letter-spacing: 0.16em;
    margin-right: -0.16em;
  }
}
</style>
