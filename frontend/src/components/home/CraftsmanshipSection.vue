<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();

// Five details, in the order a watchmaker would build them up.
const details = computed(() => [
  { key: 'movement', image: '/images/swisswatch_standard.jpg' },
  { key: 'case', image: '/images/tsarbomba_tb8204.jpg' },
  { key: 'dial', image: '/images/tsarbomba_tb8208.jpg' },
  { key: 'bracelet', image: '/images/swisswatch_provenance.jpg' },
  { key: 'finishing', image: '/images/swisswatch_concierge.jpg' },
].map((item, index) => ({
  ...item,
  index: String(index + 1).padStart(2, '0'),
  title: locale.t(`home.craft_${item.key}_title`),
  body: locale.t(`home.craft_${item.key}_body`),
})));
</script>

<template>
  <section class="sw-craft sw-section">
    <div class="sw-craft__inner">
      <div class="sw-craft__aside">
        <div class="sw-craft__aside-sticky">
          <span v-reveal class="sw-eyebrow">{{ locale.t('home.craftEyebrow') }}</span>
          <h2 v-reveal="0.08" class="sw-h2 sw-craft__title">{{ locale.t('home.craftTitle') }}</h2>
          <p v-reveal="0.16" class="sw-body sw-craft__lede">{{ locale.t('home.craftLede') }}</p>
        </div>
      </div>

      <ol class="sw-craft__list">
        <li v-for="detail in details" :key="detail.key" class="sw-craft__item">
          <figure v-reveal.clip class="sw-craft__media">
            <SmartImage
              :src="detail.image"
              :alt="detail.title"
              aspect-ratio="16 / 10"
              sizes="(max-width: 900px) 92vw, 42vw"
            />
          </figure>
          <div v-reveal="0.08" class="sw-craft__caption">
            <span class="sw-craft__index">{{ detail.index }}</span>
            <h3 class="sw-craft__item-title">{{ detail.title }}</h3>
            <p class="sw-body sw-craft__item-body">{{ detail.body }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.sw-craft {
  background: var(--sw-ivory);
  color: var(--sw-black);
}

:root[data-theme='dark'] .sw-craft {
  background: #111010;
  color: var(--sw-ivory);
}

.sw-craft__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
  column-gap: var(--space-gutter);
}

/* The section heading holds still while the five details pass it — the reader
   never loses the frame they are inside. */
.sw-craft__aside-sticky {
  position: sticky;
  top: calc(var(--header-height) + 48px);
  display: grid;
  gap: 26px;
  max-width: 34ch;
}

.sw-craft__title {
  max-width: 12ch;
}

.sw-craft__lede {
  color: rgba(28, 27, 26, 0.62);
}

:root[data-theme='dark'] .sw-craft__lede {
  color: rgba(243, 239, 231, 0.58);
}

.sw-craft__list {
  display: grid;
  gap: clamp(80px, 10vw, 160px);
}

.sw-craft__item {
  display: grid;
  gap: 32px;
}

/* Alternating inset: every other detail steps in from the left, which keeps a
   five-item column from marching. */
.sw-craft__item:nth-child(even) {
  margin-left: clamp(0px, 8%, 96px);
}

.sw-craft__media {
  overflow: hidden;
  background: var(--surface-media);
}

.sw-craft__media :deep(.sw-smart-image__img) {
  transition: transform 2s var(--ease-editorial);
}

.sw-craft__item:hover .sw-craft__media :deep(.sw-smart-image__img) {
  transform: scale(1.03);
}

.sw-craft__caption {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: clamp(24px, 3vw, 48px);
  row-gap: 12px;
  align-items: start;
}

.sw-craft__index {
  grid-row: 1 / 3;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.24em;
  color: var(--accent);
  padding-top: 0.7em;
  font-variant-numeric: tabular-nums;
}

/* #8a2e3c is legible against ivory but sinks into the dark surface — lift it
   just enough for a 10px label to stay readable. */
:root[data-theme='dark'] .sw-craft__index {
  color: #b4586a;
}

.sw-craft__item-title {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: clamp(1.375rem, 2vw, 1.875rem);
  line-height: 1.2;
}

.sw-craft__item-body {
  max-width: 48ch;
  color: rgba(28, 27, 26, 0.6);
}

:root[data-theme='dark'] .sw-craft__item-body {
  color: rgba(243, 239, 231, 0.55);
}

@media (max-width: 900px) {
  .sw-craft__inner {
    grid-template-columns: 1fr;
    row-gap: clamp(56px, 9vw, 96px);
  }

  .sw-craft__aside-sticky {
    position: static;
    max-width: none;
  }

  .sw-craft__list {
    gap: 64px;
  }

  .sw-craft__item:nth-child(even) {
    margin-left: 0;
  }

  .sw-craft__caption {
    grid-template-columns: 1fr;
    row-gap: 10px;
  }

  .sw-craft__index {
    grid-row: auto;
    padding-top: 0;
  }
}
</style>
