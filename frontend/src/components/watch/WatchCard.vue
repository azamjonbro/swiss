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
</script>

<template>
  <RouterLink :to="`/watches/${watch.slug}`" class="sw-watch-card" :class="`is-${size}`" data-cursor="Discover">
    <div class="sw-watch-card__media">
      <SmartImage :src="watch.images?.[0]" :alt="`${brandName} ${watch.name}`" aspect-ratio="4 / 5" object-fit="contain" />
      <span v-if="watch.isNewArrival" class="sw-watch-card__badge">{{ locale.t('watchCard.newBadge') }}</span>
    </div>
    <div class="sw-watch-card__info">
      <span class="sw-label sw-watch-card__brand">{{ brandName }}</span>
      <span class="sw-watch-card__name">{{ watch.name }}</span>
      <span class="sw-watch-card__price">{{ currency.format(watch.price) }}</span>
      <span class="sw-watch-card__cta sw-btn">
        {{ locale.t('watchCard.view') }} <span class="sw-btn__arrow">&rarr;</span>
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
  background: var(--sw-gray-200);
  padding: 10%;
}

.sw-watch-card__media :deep(.sw-smart-image__img) {
  transition: transform 1.2s var(--ease-luxury);
}

.sw-watch-card:hover .sw-watch-card__media :deep(.sw-smart-image__img) {
  transform: scale(1.045);
}

.sw-watch-card__badge {
  position: absolute;
  top: 16px;
  left: 16px;
  background: var(--sw-black);
  color: var(--sw-white);
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 6px 12px;
}

.sw-watch-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 20px;
}

.sw-watch-card__brand {
  color: var(--text-muted);
}

.sw-watch-card__name {
  font-family: var(--font-serif);
  font-size: 1.375rem;
}

.sw-watch-card__price {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.sw-watch-card__cta {
  margin-top: 10px;
  padding: 0;
  border-bottom: none;
  font-size: 0.72rem;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.sw-watch-card:hover .sw-watch-card__cta {
  opacity: 1;
  transform: translateY(0);
}

.sw-watch-card.is-lg .sw-watch-card__name {
  font-size: 1.75rem;
}
</style>
