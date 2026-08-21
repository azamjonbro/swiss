<script setup lang="ts">
import type { Watch } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import WatchCard from '@/components/watch/WatchCard.vue';

interface Props {
  watches: Watch[];
}

defineProps<Props>();
const locale = useLocaleStore();
</script>

<template>
  <section id="featured-collection" class="sw-featured">
    <div class="sw-featured__header">
      <span class="sw-eyebrow">{{ locale.t('home.featuredEyebrow') }}</span>
      <h2 class="sw-h1">{{ locale.t('home.featuredTitle') }}</h2>
      <RouterLink class="sw-btn sw-featured__all" to="/watches">
        {{ locale.t('home.viewAll') }} <span class="sw-btn__arrow">&rarr;</span>
      </RouterLink>
    </div>

    <div class="sw-featured__grid">
      <div
        v-for="(watch, index) in watches"
        :key="watch._id"
        class="sw-featured__cell"
        :class="`sw-featured__cell--${index % 4}`"
      >
        <WatchCard :watch="watch" size="lg" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sw-featured {
  padding: clamp(80px, 10vw, 140px) var(--container-pad);
}

.sw-featured__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: clamp(48px, 6vw, 80px);
  border-bottom: 1px solid var(--border);
  padding-bottom: 32px;
}

.sw-featured__grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: clamp(24px, 3vw, 48px);
}

.sw-featured__cell--0 {
  grid-column: span 3;
}

.sw-featured__cell--1 {
  grid-column: span 3;
  margin-top: 80px;
}

.sw-featured__cell--2 {
  grid-column: span 2;
}

.sw-featured__cell--3 {
  grid-column: span 4;
}

@media (max-width: 900px) {
  .sw-featured__grid {
    grid-template-columns: 1fr 1fr;
  }

  .sw-featured__cell--0,
  .sw-featured__cell--1,
  .sw-featured__cell--2,
  .sw-featured__cell--3 {
    grid-column: span 1;
    margin-top: 0;
  }
}

@media (max-width: 560px) {
  .sw-featured__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .sw-featured__grid {
    grid-template-columns: 1fr;
  }
}
</style>
