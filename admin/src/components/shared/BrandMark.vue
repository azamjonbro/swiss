<script setup lang="ts">
interface Props {
  /** Mark height in px (the tile is square). */
  size?: number;
  /** Render the "SwissWatch / Console" lockup next to the tile. */
  wordmark?: boolean;
  /** Label under the name in the lockup. */
  sublabel?: string;
}

withDefaults(defineProps<Props>(), { size: 30, wordmark: true, sublabel: '' });
</script>

<template>
  <span class="sw-mark">
    <!--
      The house mark, traced from the boutique's own logo artwork: four crimson
      panels cut apart by two hand-drawn channels, the upright leaning and the
      bar riding a little high, with the small stone where the strokes cross.
      These are the same five paths as the storefront's BrandMark.vue and both
      favicon.svg files — the admin used to draw its own centred plus sign
      instead, which was not the brand's mark at all. Change one, change all.
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
      <rect width="40" height="40" fill="var(--brand-ivory)" />
      <path d="M0 0L16.06 0 16.74 16.74 15.2 16.97 1.26 17.6 16.57 18.29 16.86 18.46 16.86 21.14 0 20.46Z" fill="var(--brand-crimson)" />
      <path d="M40 0L40 15.89 23.14 16.57 22.29 1.54 21.66 16.46 21.2 16.69 18.74 16.69 19.43 0Z" fill="var(--brand-crimson)" />
      <path d="M21.43 21.31L18.86 21.31 18.57 21.14 18.69 18.46 21.43 18.51Z" fill="var(--brand-crimson)" />
      <path d="M40 40L24.06 40 23.31 23.03 24.8 22.8 38.46 22.17 23.43 21.49 23.26 21.26 23.2 18.63 40 19.31Z" fill="var(--brand-crimson)" />
      <path d="M0 40L0 23.89 17.03 23.26 17.77 38.51 18.46 23.37 18.69 23.09 21.31 23.09 20.63 40Z" fill="var(--brand-crimson)" />
    </svg>

    <span v-if="wordmark" class="sw-mark__word">
      SwissWatch
      <span v-if="sublabel">{{ sublabel }}</span>
    </span>
  </span>
</template>

<style scoped>
.sw-mark {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: inherit;
}

/* The artwork runs to the edge of its own tile, so the rounding has to be
   clipped here rather than drawn as a rounded <rect> behind it. */
.sw-mark__glyph {
  flex: none;
  border-radius: 8px;
  overflow: hidden;
}

.sw-mark__word {
  font-weight: 650;
  font-size: 1rem;
  letter-spacing: -0.015em;
  line-height: 1.15;
  white-space: nowrap;
}

.sw-mark__word span {
  display: block;
  margin-top: 2px;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--admin-text-subtle);
}
</style>
