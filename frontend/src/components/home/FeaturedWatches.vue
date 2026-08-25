<script setup lang="ts">
import { computed } from 'vue';
import type { Watch } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import WatchCard from '@/components/watch/WatchCard.vue';

interface Props {
  watches: Watch[];
}

const props = defineProps<Props>();
const locale = useLocaleStore();

// Three pieces, never more. A wall of product is a catalogue; three is an
// editorial selection.
const selection = computed(() => props.watches.slice(0, 3));
</script>

<template>
  <section id="featured-collection" class="sw-featured sw-section">
    <div class="sw-featured__inner">
      <header class="sw-featured__header">
        <span v-reveal class="sw-eyebrow">{{ locale.t('home.featuredEyebrow') }}</span>
        <h2 v-reveal="0.08" class="sw-h1 sw-featured__title">{{ locale.t('home.featuredTitle') }}</h2>
        <p v-reveal="0.16" class="sw-featured__note sw-body">{{ locale.t('home.featuredNote') }}</p>
      </header>

      <div class="sw-featured__grid">
        <article
          v-for="(watch, index) in selection"
          :key="watch._id"
          v-reveal="{ delay: index * 0.12, y: 28 }"
          class="sw-featured__cell"
        >
          <WatchCard :watch="watch" size="lg" />
        </article>
      </div>

      <footer class="sw-featured__footer">
        <RouterLink v-reveal class="sw-btn" to="/watches">
          {{ locale.t('home.viewAll') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </RouterLink>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.sw-featured__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

.sw-featured__header {
  display: grid;
  gap: 26px;
  max-width: 62ch;
  margin-bottom: clamp(64px, 8vw, 120px);
}

.sw-featured__title {
  max-width: 16ch;
}

.sw-featured__note {
  max-width: 46ch;
}

.sw-featured__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-gutter);
}

/* A gentle vertical drift across the row — enough to break the catalogue grid,
   not so much that the three pieces stop reading as one selection. */
.sw-featured__cell:nth-child(2) {
  margin-top: clamp(32px, 5vw, 88px);
}

.sw-featured__cell:nth-child(3) {
  margin-top: clamp(16px, 2.5vw, 44px);
}

.sw-featured__footer {
  margin-top: clamp(64px, 8vw, 112px);
  padding-top: 40px;
  border-top: 1px solid var(--hairline);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .sw-featured__grid {
    grid-template-columns: 1fr 1fr;
    gap: clamp(24px, 4vw, 40px);
  }

  .sw-featured__cell:nth-child(2),
  .sw-featured__cell:nth-child(3) {
    margin-top: 0;
  }

  /* The third piece takes the full width of the second row rather than
     sitting beside a hole. */
  .sw-featured__cell:nth-child(3) {
    grid-column: span 2;
    max-width: 50%;
  }
}

@media (max-width: 560px) {
  .sw-featured__grid {
    grid-template-columns: 1fr;
    gap: 56px;
  }

  .sw-featured__cell:nth-child(3) {
    grid-column: auto;
    max-width: none;
  }

  .sw-featured__footer {
    justify-content: flex-start;
  }
}
</style>
