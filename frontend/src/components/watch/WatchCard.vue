<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Watch } from '@/types/models';
import { toBrandName, primaryImage, secondaryImage, colorSwatchHex, movementType } from '@/utils/format';
import { modelColors, modelPriceRange } from '@/utils/modelGroup';
import { useCurrencyStore } from '@/stores/currency';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';
import { productPath, watchImageAlt } from '@/seo/schema.mjs';

interface Props {
  watch: Watch;
  size?: 'md' | 'lg';
  /**
   * Set on the handful of cards that are above the fold. Their photograph is
   * the first thing the page has to show, so it is fetched eagerly and at high
   * priority instead of queueing behind every other card's lazy load.
   */
  priority?: boolean;
}

const props = withDefaults(defineProps<Props>(), { size: 'md', priority: false });

/**
 * The second angle is not loaded until the pointer arrives.
 *
 * It doubled every listing page's image count — two shots per card, both
 * fetched on first paint, competing over the same six connections as the
 * covers the visitor is actually looking at, and on a touch device the hover
 * state it exists for can never happen at all. Mounting it on the first
 * pointer or focus makes the cover the only thing the grid pays for, and the
 * blur placeholder covers the moment between the pointer arriving and the
 * second shot landing.
 */
const hoverArmed = ref(false);

const currency = useCurrencyStore();
const locale = useLocaleStore();
const brandName = computed(() => toBrandName(props.watch.brand));
const movementLabel = computed(() => movementType(props.watch.movement));

// Availability is only worth a line when it's an exception to the assumed
// in-stock default — printing "Available" on every single card is noise.
const availabilityLabel = computed(() => {
  const a = props.watch.availability;
  if (!a || a === 'in-stock') return '';
  const key = a === 'made-to-order' ? 'madeToOrder' : a;
  return locale.t(`watchDetail.${key}`);
});

const mainImage = computed(() => primaryImage(props.watch));
// Prefer a second angle of the same colourway on hover; when a product has
// none, fall back to the next color's shot rather than not swapping at all.
const hoverImage = computed(() => secondaryImage(props.watch) ?? props.watch.variants?.[1]?.images?.[0]);

/**
 * The card speaks for the whole model, not for the one colourway the API sent
 * as its representative — so the swatches are every colour in the run and the
 * price is the cheapest of them, marked "from" when they are not all the same.
 *
 * Without `siblings` (an ungrouped response) these fall back to exactly what
 * the card printed before: this product's own colours and its own price.
 */
const colors = computed(() => modelColors(props.watch));
const priceRange = computed(() => modelPriceRange(props.watch));

const priceLabel = computed(() => {
  const { min, max } = priceRange.value;
  const price = currency.format(min);
  return min === max ? price : locale.t('watchCard.fromPrice').replace('{price}', price);
});

/**
 * How many swatches fit before the row stops reading as a colour range and
 * starts reading as a rash. The PRX 40mm has twenty-one; six and a count is
 * information, twenty-one dots is not.
 */
const SWATCH_LIMIT = 6;
const shownColors = computed(() => colors.value.slice(0, SWATCH_LIMIT));
const hiddenColorCount = computed(() => Math.max(0, colors.value.length - SWATCH_LIMIT));
</script>

<template>
  <RouterLink
    :to="productPath(watch.slug)"
    class="sw-watch-card"
    :class="`is-${size}`"
    data-cursor="View"
    @pointerenter="hoverArmed = true"
    @focusin="hoverArmed = true"
  >
    <div class="sw-watch-card__media">
      <SmartImage
        :src="mainImage"
        :alt="watchImageAlt(watch)"
        aspect-ratio="1 / 1"
        object-fit="contain"
        prefer-trimmed
        :eager="priority"
        sizes="(max-width: 460px) 92vw, (max-width: 980px) 47vw, 24vw"
        class="sw-watch-card__shot sw-watch-card__shot--main"
      />
      <SmartImage
        v-if="hoverImage && hoverArmed"
        :src="hoverImage"
        :alt="watchImageAlt(watch)"
        aspect-ratio="1 / 1"
        object-fit="contain"
        prefer-trimmed
        eager
        sizes="(max-width: 460px) 92vw, (max-width: 980px) 47vw, 24vw"
        class="sw-watch-card__shot sw-watch-card__shot--hover"
      />
    </div>

    <div class="sw-watch-card__info">
      <span class="sw-watch-card__brand">{{ brandName }}</span>
      <h3 class="sw-watch-card__name">{{ watch.name }}</h3>
      <span v-if="movementLabel" class="sw-watch-card__type">{{ movementLabel }}</span>
      <span class="sw-watch-card__price">{{ priceLabel }}</span>
      <span v-if="availabilityLabel" class="sw-watch-card__availability">{{ availabilityLabel }}</span>

      <span
        v-if="colors.length > 1"
        class="sw-watch-card__colors"
        :aria-label="locale.t('watchCard.colorCount').replace('{count}', String(colors.length))"
      >
        <span
          v-for="variant in shownColors"
          :key="variant.colorSlug"
          class="sw-watch-card__dot"
          :title="variant.colorLabel"
          :style="{ background: colorSwatchHex(variant.colorSlug) }"
        />
        <span v-if="hiddenColorCount" class="sw-watch-card__dot-more" aria-hidden="true">
          +{{ hiddenColorCount }}
        </span>
      </span>

      <span class="sw-watch-card__cta">
        {{ locale.t('watchCard.view') }}
        <span class="sw-watch-card__arrow" aria-hidden="true">&rarr;</span>
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.sw-watch-card {
  display: block;
}

/* Deliberately matches the page background, not --surface-media (a
   noticeably darker gray meant for other backdrops) — the trimmed product
   photography already carries its own near-white background, so matching
   --bg exactly is what lets the watch float on the page with no visible
   card frame, rather than sitting in a box-within-a-box. */
.sw-watch-card__media {
  position: relative;
  overflow: hidden;
  background: var(--bg);
  padding: 5%;
}

/* SmartImage defaults to --surface-media so it reads as a loading skeleton
   on its own, but that gray fill shows through around the watch whenever
   object-fit: contain leaves empty space — a visible dirty-gray box behind
   the product shot. Cards want the photo floating directly on the page
   background instead, so override it to match the container above. */
.sw-watch-card__media :deep(.sw-smart-image) {
  background: var(--bg);
}

.sw-watch-card__media :deep(.sw-smart-image__img) {
  transition: transform 0.55s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__media :deep(.sw-smart-image__img),
.sw-watch-card:focus-visible .sw-watch-card__media :deep(.sw-smart-image__img) {
  transform: scale(1.045) translateY(-6px);
}

.sw-watch-card__shot--hover {
  position: absolute;
  inset: 5%;
  opacity: 0;
  transition: opacity 0.5s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__shot--hover,
.sw-watch-card:focus-visible .sw-watch-card__shot--hover {
  opacity: 1;
}

@media (hover: none) {
  .sw-watch-card__shot--hover {
    display: none;
  }
}

.sw-watch-card__colors {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
}

.sw-watch-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--border) inset;
  /* The row is fixed-width by design (six swatches plus a count), so a dot must
     never be squeezed thinner than round by a long colour run. */
  flex: none;
}

.sw-watch-card__dot-more {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-left: 2px;
}

.sw-watch-card__info {
  display: grid;
  gap: 0;
  padding-top: 26px;
  transition: transform 0.55s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__info,
.sw-watch-card:focus-visible .sw-watch-card__info {
  transform: translateY(-3px);
}

.sw-watch-card__brand {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-watch-card__name {
  margin-top: 12px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1.18;
  letter-spacing: -0.008em;
  font-variant-numeric: lining-nums;
}

.sw-watch-card__type {
  margin-top: 6px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.sw-watch-card__price {
  margin-top: 14px;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.sw-watch-card__availability {
  margin-top: 6px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* The CTA occupies its row from the start — it fades in rather than pushing
   the card taller, so nothing below it shifts on hover. */
.sw-watch-card__cta {
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.5s var(--ease-editorial),
    transform 0.5s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__cta,
.sw-watch-card:focus-visible .sw-watch-card__cta {
  opacity: 1;
  transform: none;
}

.sw-watch-card__arrow {
  transition: transform 0.5s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__arrow {
  transform: translateX(5px);
}

.sw-watch-card.is-lg .sw-watch-card__name {
  font-size: clamp(1.625rem, 2vw, 2rem);
}

/* Touch devices never fire hover, so the CTA would stay invisible. */
@media (hover: none) {
  .sw-watch-card__cta {
    opacity: 1;
    transform: none;
  }
}
</style>
