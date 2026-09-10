<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { resolveMediaUrl } from '@/utils/media';
import imageWidths from '@/data/image-widths.json';
import imageLqip from '@/data/image-lqip.json';

interface Props {
  src?: string | null;
  alt: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain';
  eager?: boolean;
  /** Card thumbnails only — see the trimmed-derivative note below. */
  preferTrimmed?: boolean;
  /**
   * The `sizes` hint that goes with the generated `srcset`. Without it the
   * browser assumes the image fills the viewport and picks the widest file,
   * which throws the whole point away — so pass the width the layout actually
   * gives this image. Ignored for sources that have no variants.
   */
  sizes?: string;
  /**
   * A second rendition for phones — art direction, not a width variant.
   *
   * The hero is the case this exists for: a 16:9 plate cover-fitted into a
   * portrait phone frame shows a ~390px slice of itself blown up across ~1200
   * device pixels, which is a 3x upscale however many width variants the file
   * has, because `srcset` picks by *layout width* and knows nothing about the
   * crop. A portrait rendition of the same subject is the only thing that
   * fixes it. Listed in the manifest like any other source, so it gets its own
   * width variants; ignored when absent, which is every other image.
   */
  mobileSrc?: string;
  /** The width below which `mobileSrc` is used. */
  mobileMedia?: string;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  aspectRatio: undefined,
  objectFit: 'cover',
  eager: false,
  preferTrimmed: false,
  sizes: undefined,
  mobileSrc: undefined,
  mobileMedia: '(max-width: 640px)',
});

const loaded = ref(false);
const errored = ref(false);
/** The blur placeholder has arrived and is worth painting. */
const lqipReady = ref(false);
/** Index into `candidates` of the URL currently being attempted. */
const candidateIndex = ref(0);

const JPG_PNG = /^\/(images|uploads\/images)\/.+\.(jpe?g|png)$/i;

/**
 * Whether the background-removed derivatives are actually on disk.
 *
 * They are produced by a maintenance script that runs against the upload
 * library on the server (backend/scripts/remove-product-bg.py), not by the
 * frontend build, so the bundle cannot know from its own filesystem whether
 * they exist — and the candidate chain below has no way to find out except by
 * asking for one and waiting for the answer.
 *
 * That answer is expensive. Measured against production: a `_trim` URL that
 * does not exist takes ~530ms to come back 404, the chain tries two of them
 * (.webp then .png) *before* requesting the real photograph, and a listing
 * card renders two shots — so every card was spending roughly two seconds of
 * serial round trips discovering nothing, twenty-four cards at a time, through
 * a six-connection budget. On a catalogue where the real thumbnail is 3 KB and
 * arrives in half a second, that was the entire reason the grid felt slow.
 *
 * So the guess is a decision, not a probe: off until someone has run the
 * script and set the flag. Wrong-but-off costs a slightly loose crop; the
 * other way round costs the page.
 */
const HAS_TRIMMED_UPLOADS = import.meta.env.VITE_TRIMMED_UPLOADS === '1';

/**
 * Ordered fallback chain, tried in turn via onError so a missing derivative
 * costs one failed request rather than a broken image.
 *
 * When `preferTrimmed` is set (product-grid card thumbnails), a
 * background-removed "<name>_trim" derivative is tried first — real ML
 * segmentation (scripts/remove-product-bg.py, rembg/u2net), not a white-pixel
 * threshold, so it also works on the handful of dark editorial/lifestyle
 * shots. Source photography carries wildly inconsistent amounts of margin
 * baked into the file (some shots ~60% empty space, others ~95% watch),
 * which made cards look randomly different in scale even in identical
 * containers; the derivative is cropped to the watch's actual content box
 * (plus a little breathing room) so it reads at a consistent size everywhere,
 * and — since it's true alpha transparency rather than a baked-in white
 * background — shows correctly in both the light and dark theme. Only .webp
 * and .png carry alpha (a JPEG can't), so this chain always ends on the
 * untouched original JPEG, which is guaranteed to exist.
 */
const candidates = computed(() => {
  const src = props.src ?? '';
  const isJpgPng = JPG_PNG.test(src);
  const list: string[] = [];

  if (props.preferTrimmed && isJpgPng && HAS_TRIMMED_UPLOADS) {
    const trimBase = src.replace(/\.(jpe?g|png)$/i, '_trim');
    list.push(resolveMediaUrl(`${trimBase}.webp`));
    list.push(resolveMediaUrl(`${trimBase}.png`));
  }
  // Everything under /public/images ships with a WebP sibling (roughly an
  // eighth of the JPEG's weight), so it is worth asking for by name.
  //
  // Product photography is not: the API re-encodes every `?w=` request to WebP
  // whatever the source format is, so the sibling would buy nothing — and 917
  // of the 2 498 originals have no `.webp` next to them, which turned the guess
  // into a guaranteed 404 and a second round trip (~0.5s each on this host)
  // before the real file was even requested.
  if (isJpgPng && !src.includes('/uploads/images/')) {
    list.push(resolveMediaUrl(src.replace(/\.(jpe?g|png)$/i, '.webp')));
  }
  list.push(resolveMediaUrl(src));
  return list;
});

const displaySrc = computed(() => candidates.value[candidateIndex.value] ?? '');

/**
 * Width variants for the editorial photography, generated by
 * scripts/responsive-images.mjs. Only sources listed in the manifest get a
 * `srcset`: unlike the candidate chain above, a srcset entry that 404s gives a
 * broken image rather than falling back, so guessing is not an option. Product
 * photography is served from the API host and has no variants, so it keeps the
 * single-source path.
 */
/**
 * Product photography is resized by the API on request
 * (backend/src/middleware/resizeImages.ts), so unlike the editorial set it
 * needs no manifest — every allowed width of an existing file resolves, and a
 * file that does not exist was already broken at its base URL. These have to
 * match ALLOWED_WIDTHS on the server; anything else falls through to the
 * full-size original.
 */
const UPLOAD_WIDTHS = [240, 480, 720, 960, 1440];

function buildSrcset(src: string): string | undefined {
  if (!src) return undefined;

  if (src.includes('/uploads/images/')) {
    return UPLOAD_WIDTHS.map((w) => `${src}?w=${w} ${w}w`).join(', ');
  }

  const widths = imageWidths[src as keyof typeof imageWidths] as number[] | undefined;
  if (!widths?.length) return undefined;
  const stem = src.replace(/\.webp$/, '');
  const max = Math.max(...widths);
  return widths.map((w) => (w === max ? `${src} ${w}w` : `${stem}-${w}.webp ${w}w`)).join(', ');
}

const srcset = computed(() => buildSrcset(displaySrc.value));

/**
 * The phone rendition, as a `<source>` ahead of the `<img>`.
 *
 * `.webp` by name for the same reason the candidate chain asks for it: every
 * file under public/images ships one. There is no fallback chain here — a
 * `<source>` that 404s gives a broken image rather than falling through — so
 * this is emitted only for a source the manifest actually lists, which is the
 * build's own record of what it generated.
 */
const mobileSrcset = computed(() => {
  const src = props.mobileSrc ?? '';
  if (!src) return undefined;
  return buildSrcset(resolveMediaUrl(src.replace(/\.(jpe?g|png)$/i, '.webp')));
});

/**
 * The blurred stand-in painted underneath the real photograph until it lands.
 *
 * A shimmer says "something is coming"; a blur says "*this* is coming" — the
 * composition, the colour of the dial, whether the piece is steel or gold are
 * all legible at 20-24px through a heavy blur, and the swap to the full image
 * then reads as the picture sharpening rather than as a card changing content.
 * On a catalogue whose product shots run to hundreds of kilobytes over a
 * mobile connection, that is most of the perceived load time.
 *
 * Two sources, because the two halves of this site's imagery are stored
 * differently and neither should pay for the other's mechanism:
 *
 *   - Product photography lives on the API, which already resizes on request,
 *     so the placeholder is a real `?w=240` fetch — 2-3 KB, and the narrowest
 *     width the deployed API already serves, so it works without waiting on a
 *     backend release.
 *   - Editorial photography ships with the bundle and its placeholder is
 *     inlined at build time (scripts/responsive-images.mjs), so the hero has
 *     something on screen on the first frame instead of after a round trip.
 *
 * Anything else — a remote URL, an SVG, a data URI — gets no placeholder and
 * falls back to the shimmer, which is what it did before.
 */
const LQIP_WIDTH = 240;

const lqipSrc = computed(() => {
  const src = props.src ?? '';
  if (!src.startsWith('/')) return '';

  if (src.startsWith('/uploads/images/')) {
    // Keyed on the *original*, never on a `_trim` derivative that may not
    // exist: a 404 here would leave the card with no placeholder at all, and
    // the untrimmed shot blurs to the same few colours anyway.
    return `${resolveMediaUrl(src)}?w=${LQIP_WIDTH}`;
  }

  const key = src.replace(/\.(jpe?g|png)$/i, '.webp');
  return (imageLqip as Record<string, string>)[key] ?? '';
});

watch(
  () => [props.src, props.preferTrimmed],
  () => {
    loaded.value = false;
    errored.value = false;
    lqipReady.value = false;
    candidateIndex.value = 0;
  },
);

function onLoad() {
  loaded.value = true;
}

function onError() {
  if (candidateIndex.value < candidates.value.length - 1) {
    candidateIndex.value += 1;
    return;
  }
  errored.value = true;
}
</script>

<template>
  <div class="sw-smart-image" :style="aspectRatio ? { aspectRatio } : undefined">
    <!-- The animated shimmer is the floor, not the plan: it runs only until the
         blur placeholder paints over it, and is what a source with no
         placeholder still gets. -->
    <div class="sw-smart-image__placeholder" :class="{ 'is-hidden': loaded || lqipReady }" />
    <!-- Stays mounted after the real image lands: unmounting it on `loaded`
         pulled it out from under a photograph that is still 0.6s into its own
         fade-in, so the card flashed back to bare surface mid-transition. It
         fades out instead, under the image fading in. Lazy for the same reason
         the real image is — a placeholder for a card eight screens down is not
         worth a request until the card is nearly in view; being ~400 bytes
         against the photograph's tens of kilobytes is what makes it win the
         race once both are in flight. -->
    <img
      v-if="lqipSrc"
      :key="lqipSrc"
      :src="lqipSrc"
      alt=""
      aria-hidden="true"
      class="sw-smart-image__lqip"
      :class="{ 'is-ready': lqipReady && !loaded }"
      :style="{ objectFit }"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @load="lqipReady = true"
    />
    <!-- `display: contents` on the picture, so adding art direction changes
         what is fetched and nothing about the layout the img already had. -->
    <picture v-if="displaySrc && !errored" class="sw-smart-image__picture">
      <source v-if="mobileSrcset" :media="mobileMedia" :srcset="mobileSrcset" :sizes="sizes ?? '100vw'" type="image/webp" />
      <img
        :key="displaySrc"
        :src="displaySrc"
        :srcset="srcset"
        :sizes="srcset ? (sizes ?? '100vw') : undefined"
        :alt="alt"
        :loading="eager ? 'eager' : 'lazy'"
        :decoding="eager ? 'sync' : 'async'"
        :fetchpriority="eager ? 'high' : 'auto'"
        class="sw-smart-image__img"
        :class="{ 'is-loaded': loaded }"
        :style="{ objectFit }"
        @load="onLoad"
        @error="onError"
      />
    </picture>
    <div v-else class="sw-smart-image__fallback" aria-hidden="true" />
  </div>
</template>

<style scoped>
.sw-smart-image {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: var(--surface-media);
}

.sw-smart-image__picture {
  display: contents;
}

.sw-smart-image__placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, var(--surface-media) 0%, var(--surface-media-hi) 50%, var(--surface-media) 100%);
  background-size: 200% 100%;
  animation: sw-shimmer 1.8s ease-in-out infinite;
  transition: opacity var(--dur-mid) var(--ease-luxury);
}

.sw-smart-image__placeholder.is-hidden {
  opacity: 0;
  pointer-events: none;
}

/* The blur placeholder. A 20-24px image scaled to the full box would show its
   own pixel grid, so the blur is doing two jobs at once: hiding the grid and
   reading as "still loading". `scale` past 1 pushes the blur's soft, partly
   transparent edge outside the frame — otherwise the box is ringed by a pale
   halo where the filter has faded the image into nothing. */
.sw-smart-image__lqip {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  filter: blur(18px);
  transform: scale(1.12);
  /* Slow out, fast in. Removing `is-ready` falls back to this duration, which
     matches the real image's fade-in exactly, so the two cross-dissolve
     instead of the blur disappearing halfway through. */
  transition: opacity var(--dur-mid) var(--ease-luxury);
}

.sw-smart-image__lqip.is-ready {
  opacity: 1;
  /* Adding it should not take 0.6s: the blur is what the viewer is waiting to
     see, and it is already decoded by the time this class lands. */
  transition-duration: var(--dur-fast);
}

.sw-smart-image__img {
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(1.03);
  transition: opacity var(--dur-mid) var(--ease-luxury), transform 0.9s var(--ease-luxury);
}

.sw-smart-image__img.is-loaded {
  opacity: 1;
  transform: scale(1);
}

.sw-smart-image__fallback {
  position: absolute;
  inset: 0;
  background: var(--surface-media);
}

@keyframes sw-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-smart-image__img {
    transition: opacity var(--dur-fast) linear;
    transform: none;
  }

  /* The blur stays — it is information about loading state, not decoration —
     and so does its scale, which is static framing rather than motion (it is
     what keeps the blur's soft edge outside the frame). Only the eased
     cross-dissolve goes. */
  .sw-smart-image__lqip,
  .sw-smart-image__lqip.is-ready {
    transition: opacity var(--dur-fast) linear;
  }
}
</style>
