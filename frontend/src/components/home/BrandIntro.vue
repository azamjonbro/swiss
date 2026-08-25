<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();
</script>

<template>
  <!-- The breath between the hero and the collection: three lines, one
       paragraph, and a great deal of nothing. -->
  <section class="sw-brand-intro">
    <div class="sw-brand-intro__inner">
      <h2 class="sw-brand-intro__lines">
        <span v-reveal class="sw-h1 sw-brand-intro__line">{{ locale.t('home.introLine1') }}</span>
        <span v-reveal="0.1" class="sw-h1 sw-brand-intro__line">{{ locale.t('home.introLine2') }}</span>
        <span v-reveal="0.2" class="sw-h1 sw-brand-intro__line sw-brand-intro__line--accent">
          {{ locale.t('home.introLine3') }}
        </span>
      </h2>

      <p v-reveal="0.34" class="sw-body sw-brand-intro__copy">{{ locale.t('home.introCopy') }}</p>
    </div>
  </section>
</template>

<style scoped>
/* Asymmetric padding on purpose: the statement gets the full opening breath,
   but its trailing space is shared with the collection section that follows,
   so the two don't stack into an empty screen. */
.sw-brand-intro {
  padding-top: var(--space-section);
  padding-bottom: var(--space-section-sm);
}

.sw-brand-intro__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
  column-gap: var(--space-gutter);
  align-items: end;
}

.sw-brand-intro__lines {
  display: grid;
  font-weight: inherit;
}

.sw-brand-intro__line {
  display: block;
}

.sw-brand-intro__line--accent {
  color: var(--accent);
  font-style: italic;
  /* Italic serif overhangs its box on the left — nudge it back onto the
     baseline grid set by the two roman lines above. */
  margin-left: -0.02em;
}

.sw-brand-intro__copy {
  max-width: 42ch;
  padding-bottom: 0.7em;
}

@media (max-width: 900px) {
  .sw-brand-intro__inner {
    grid-template-columns: 1fr;
    row-gap: 40px;
    align-items: start;
  }

  .sw-brand-intro__copy {
    padding-bottom: 0;
  }
}
</style>
