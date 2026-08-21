<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import { scrollTo } from '@/composables/useLenis';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();
const heroImage = '/images/swisswatch_hero.jpg';

const mediaEl = ref<HTMLElement | null>(null);
const eyebrowEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
const subEl = ref<HTMLElement | null>(null);
const ctaEl = ref<HTMLElement | null>(null);
const scrollHintEl = ref<HTMLElement | null>(null);

onMounted(() => {
  if (prefersReducedMotion()) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo(mediaEl.value, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.6 })
    .fromTo(eyebrowEl.value, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8 }, '-=1.0')
    .fromTo(titleEl.value, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0 }, '-=0.5')
    .fromTo(subEl.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .fromTo(ctaEl.value, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
    .fromTo(scrollHintEl.value, { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.3');
});

function handleDiscover() {
  scrollTo('#featured-collection');
}
</script>

<template>
  <section class="sw-hero">
    <div ref="mediaEl" class="sw-hero__media">
      <SmartImage :src="heroImage" alt="A SwissWatch timepiece resting on dark stone" eager />
      <div class="sw-hero__overlay" />
    </div>

    <div class="sw-hero__content">
      <span ref="eyebrowEl" class="sw-eyebrow sw-hero__eyebrow">{{ locale.t('home.heroEyebrow') }}</span>
      <h1 ref="titleEl" class="sw-display sw-hero__title">SwissWatch</h1>
      <p ref="subEl" class="sw-hero__sub">{{ locale.t('home.heroSub') }}</p>
      <div ref="ctaEl" class="sw-hero__cta">
        <button class="sw-btn" type="button" @click="handleDiscover">
          {{ locale.t('home.discover') }} <span class="sw-btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>

    <div ref="scrollHintEl" class="sw-hero__scroll">
      <span class="sw-hero__scroll-line" />
      <span class="sw-label">{{ locale.t('home.scroll') }}</span>
    </div>
  </section>
</template>

<style scoped>
.sw-hero {
  position: relative;
  height: 100svh;
  min-height: 560px;
  display: flex;
  align-items: flex-end;
  color: var(--sw-white);
  overflow: hidden;
}

.sw-hero__media {
  position: absolute;
  inset: 0;
}

.sw-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.15) 0%, rgba(10, 10, 10, 0.15) 40%, rgba(10, 10, 10, 0.75) 100%);
}

.sw-hero__content {
  position: relative;
  z-index: 1;
  padding: 0 var(--container-pad) 96px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sw-hero__eyebrow {
  color: var(--sw-gray-200);
}

.sw-hero__title {
  color: var(--sw-white);
}

.sw-hero__sub {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  color: var(--sw-gray-200);
}

.sw-hero__cta {
  margin-top: 12px;
}

.sw-hero__cta .sw-btn {
  color: var(--sw-white);
}

.sw-hero__scroll {
  position: absolute;
  right: var(--container-pad);
  bottom: 40px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--sw-gray-200);
}

.sw-hero__scroll-line {
  width: 1px;
  height: 44px;
  background: rgba(255, 255, 255, 0.4);
  overflow: hidden;
  position: relative;
}

.sw-hero__scroll-line::after {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--sw-white);
  animation: sw-scroll-hint 2.2s ease-in-out infinite;
}

@keyframes sw-scroll-hint {
  0% {
    top: -100%;
  }
  60% {
    top: 100%;
  }
  100% {
    top: 100%;
  }
}

@media (max-width: 640px) {
  .sw-hero__scroll {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-hero__scroll-line::after {
    animation: none;
    top: 0;
  }
}
</style>
