<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();

const portrait = '/images/swisswatch_about.jpg';
const detail = '/images/swisswatch_network.jpg';

const facts = computed(() => [
  { label: locale.t('home.storyFactFoundedLabel'), value: locale.t('home.storyFactFoundedValue') },
  { label: locale.t('home.storyFactAtelierLabel'), value: locale.t('home.storyFactAtelierValue') },
  { label: locale.t('home.storyFactShowroomLabel'), value: locale.t('home.storyFactShowroomValue') },
]);
</script>

<template>
  <section class="sw-story sw-section">
    <div class="sw-story__inner">
      <!-- Deliberately not text-left / image-right: the headline column starts
           at the grid's left edge, the portrait overlaps it from column five,
           and the body copy is set beneath the image rather than beside the
           title. The eye travels diagonally. -->
      <span v-reveal class="sw-eyebrow sw-story__eyebrow">{{ locale.t('home.storyEyebrow') }}</span>

      <h2 v-reveal="0.08" class="sw-h1 sw-story__title">{{ locale.t('home.storyTitle') }}</h2>

      <figure v-reveal.clip class="sw-story__portrait">
        <SmartImage :src="portrait" :alt="locale.t('home.storyPortraitAlt')" aspect-ratio="3 / 4" />
      </figure>

      <p v-reveal class="sw-lede sw-story__lede">{{ locale.t('home.storyLede') }}</p>

      <div v-reveal="0.1" class="sw-story__body">
        <p class="sw-body">{{ locale.t('home.storyBody') }}</p>
        <RouterLink class="sw-btn sw-story__cta" to="/about">
          {{ locale.t('home.storyCta') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </RouterLink>
      </div>

      <figure v-reveal.clip class="sw-story__detail">
        <SmartImage :src="detail" :alt="locale.t('home.storyDetailAlt')" aspect-ratio="4 / 3" />
      </figure>

      <dl class="sw-story__facts">
        <div v-for="(fact, index) in facts" :key="fact.label" v-reveal="{ delay: index * 0.08 }" class="sw-story__fact">
          <dt class="sw-story__fact-label">{{ fact.label }}</dt>
          <dd class="sw-story__fact-value">{{ fact.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.sw-story__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: var(--space-gutter);
  align-items: start;
}

.sw-story__eyebrow {
  grid-column: 1 / 4;
  grid-row: 1;
}

.sw-story__title {
  grid-column: 1 / 7;
  grid-row: 2;
  margin-top: 32px;
  /* Sits below the top of the portrait so the two blocks interlock. */
  margin-bottom: clamp(56px, 7vw, 120px);
}

.sw-story__portrait {
  grid-column: 7 / 13;
  grid-row: 1 / 4;
  margin-top: clamp(0px, 4vw, 64px);
}

.sw-story__lede {
  grid-column: 1 / 6;
  grid-row: 3;
  color: var(--text);
}

.sw-story__body {
  grid-column: 1 / 5;
  grid-row: 4;
  margin-top: 40px;
  display: grid;
  gap: 34px;
  justify-items: start;
}

.sw-story__detail {
  grid-column: 6 / 11;
  grid-row: 4;
  /* Pulled up into the portrait's column run — the overlap is what stops the
     layout from reading as two stacked rows. */
  margin-top: clamp(-96px, -6vw, -40px);
}

.sw-story__facts {
  grid-column: 1 / 13;
  grid-row: 5;
  margin-top: clamp(80px, 10vw, 160px);
  padding-top: 36px;
  border-top: 1px solid var(--hairline);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.sw-story__fact-label {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-story__fact-value {
  margin-top: 14px;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: clamp(1.5rem, 2.4vw, 2.25rem);
  line-height: 1.1;
}

@media (max-width: 900px) {
  .sw-story__inner {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .sw-story__title {
    margin: 24px 0 44px;
  }

  .sw-story__portrait {
    margin: 0 0 44px;
  }

  .sw-story__body {
    margin-top: 28px;
  }

  .sw-story__detail {
    margin-top: 48px;
    /* Bleeds to the viewport edge on phones — a full-width plate reads far
       more like a magazine than an inset thumbnail. */
    width: calc(100% + var(--container-pad) * 2);
    margin-left: calc(var(--container-pad) * -1);
  }

  .sw-story__facts {
    margin-top: 56px;
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
