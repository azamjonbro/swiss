<script setup lang="ts">
import { computed } from 'vue';
import type { Watch } from '@/types/models';
import { toBrandName, primaryImage, secondaryImage, colorSwatchHex, movementType } from '@/utils/format';
import { useCurrencyStore } from '@/stores/currency';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  watch: Watch;
  size?: 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), { size: 'md' });

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
const colorCount = computed(() => props.watch.variants?.length ?? 0);
</script>

<template>
  <RouterLink :to="`/watches/${watch.slug}`" class="sw-watch-card" :class="`is-${size}`" data-cursor="View">
    <div class="sw-watch-card__media">
      <SmartImage :src="mainImage" :alt="`${brandName} ${watch.name}`" aspect-ratio="1 / 1" object-fit="contain" class="sw-watch-card__shot sw-watch-card__shot--main" />
      <SmartImage
        v-if="hoverImage"
        :src="hoverImage"
        :alt="`${brandName} ${watch.name}`"
        aspect-ratio="1 / 1"
        object-fit="contain"
        class="sw-watch-card__shot sw-watch-card__shot--hover"
      />
      <span v-if="watch.isNewArrival" class="sw-watch-card__badge">{{ locale.t('watchCard.newBadge') }}</span>
    </div>

    <div class="sw-watch-card__info">
      <span class="sw-watch-card__brand">{{ brandName }}</span>
      <h3 class="sw-watch-card__name">{{ watch.name }}</h3>
      <span v-if="movementLabel" class="sw-watch-card__type">{{ movementLabel }}</span>
      <span class="sw-watch-card__price">{{ currency.format(watch.price) }}</span>
      <span v-if="availabilityLabel" class="sw-watch-card__availability">{{ availabilityLabel }}</span>

      <span v-if="colorCount > 1" class="sw-watch-card__colors" :aria-label="`${colorCount} colors`">
        <span
          v-for="variant in watch.variants"
          :key="variant.colorSlug"
          class="sw-watch-card__dot"
          :style="{ background: colorSwatchHex(variant.colorSlug) }"
        />
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

.sw-watch-card__media {
  position: relative;
  overflow: hidden;
  background: var(--surface-media);
  padding: 10%;
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
  inset: 10%;
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
}

/* No filled chip — a single line of accent small-caps is enough of a flag. */
.sw-watch-card__badge {
  position: absolute;
  top: clamp(14px, 2vw, 22px);
  left: clamp(14px, 2vw, 22px);
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
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
