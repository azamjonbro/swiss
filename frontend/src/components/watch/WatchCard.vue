<script setup lang="ts">
import { computed } from 'vue';
import type { Watch } from '@/types/models';
import { toBrandName } from '@/utils/format';
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
// The category doubles as the collection line — it is the only grouping the
// API exposes on a list payload. When it comes back unpopulated it is a raw
// id, which must never be printed.
const collectionName = computed(() => {
  const category = props.watch.category;
  return category && typeof category === 'object' ? category.name : '';
});
</script>

<template>
  <RouterLink :to="`/watches/${watch.slug}`" class="sw-watch-card" :class="`is-${size}`" data-cursor="View">
    <div class="sw-watch-card__media">
      <SmartImage :src="watch.images?.[0]" :alt="`${brandName} ${watch.name}`" aspect-ratio="4 / 5" object-fit="contain" />
      <span v-if="watch.isNewArrival" class="sw-watch-card__badge">{{ locale.t('watchCard.newBadge') }}</span>
    </div>

    <div class="sw-watch-card__info">
      <span class="sw-watch-card__brand">{{ brandName }}</span>
      <h3 class="sw-watch-card__name">{{ watch.name }}</h3>
      <span v-if="collectionName" class="sw-watch-card__collection">{{ collectionName }}</span>
      <span class="sw-watch-card__price">{{ currency.format(watch.price) }}</span>

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
  padding: 12%;
}

.sw-watch-card__media :deep(.sw-smart-image__img) {
  transition: transform 1.6s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__media :deep(.sw-smart-image__img),
.sw-watch-card:focus-visible .sw-watch-card__media :deep(.sw-smart-image__img) {
  transform: scale(1.03);
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
  /* Cormorant defaults to old-style figures, which drop below the baseline and
     read as a typo next to the capitals in a reference like "TB8204". */
  font-variant-numeric: lining-nums;
}

.sw-watch-card__collection {
  margin-top: 4px;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9375rem;
  color: var(--text-muted);
}

.sw-watch-card__price {
  margin-top: 16px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
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
    opacity 0.7s var(--ease-editorial),
    transform 0.7s var(--ease-editorial);
}

.sw-watch-card:hover .sw-watch-card__cta,
.sw-watch-card:focus-visible .sw-watch-card__cta {
  opacity: 1;
  transform: none;
}

.sw-watch-card__arrow {
  transition: transform 0.7s var(--ease-editorial);
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
