<script setup lang="ts">
import EditorialSection from '@/components/home/EditorialSection.vue';
import CtaSection from '@/components/home/CtaSection.vue';
import SmartImage from '@/components/shared/SmartImage.vue';
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();

const aboutImage = '/images/swisswatch_about.jpg';
const standardImage = '/images/swisswatch_standard.jpg';
const networkImage = '/images/swisswatch_network.jpg';
</script>

<template>
  <div class="sw-about">
    <section class="sw-about__hero">
      <SmartImage :src="aboutImage" alt="The SwissWatch atelier" eager />
      <div class="sw-about__hero-overlay" />
      <div class="sw-about__hero-content">
        <span class="sw-eyebrow">{{ locale.t('about.eyebrow') }}</span>
        <h1 class="sw-display">{{ locale.t('about.title') }}</h1>
      </div>
    </section>

    <section class="sw-about__intro">
      <p class="sw-body-lg">{{ locale.t('about.intro') }}</p>
    </section>

    <EditorialSection
      :eyebrow="locale.t('about.standardEyebrow')"
      :title="locale.t('about.standardTitle')"
      :body="locale.t('about.standardBody')"
      :image="standardImage"
    />

    <EditorialSection
      :eyebrow="locale.t('about.networkEyebrow')"
      :title="locale.t('about.networkTitle')"
      :body="locale.t('about.networkBody')"
      :image="networkImage"
      reverse
    />

    <CtaSection />
  </div>
</template>

<style scoped>
.sw-about__hero {
  position: relative;
  height: 70vh;
  min-height: 420px;
  color: var(--sw-white);
}

.sw-about__hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.2) 0%, rgba(10, 10, 10, 0.7) 100%);
}

.sw-about__hero-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 var(--container-pad) 64px;
}

.sw-about__intro {
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(64px, 8vw, 120px) var(--container-pad);
  text-align: center;
}
</style>
