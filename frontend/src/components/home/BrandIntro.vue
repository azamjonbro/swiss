<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import { useLocaleStore } from '@/stores/locale';

const locale = useLocaleStore();
const sectionEl = ref<HTMLElement | null>(null);
const line1El = ref<HTMLElement | null>(null);
const line2El = ref<HTMLElement | null>(null);
const line3El = ref<HTMLElement | null>(null);
const paragraphEl = ref<HTMLElement | null>(null);

let trigger: ScrollTrigger | undefined;

onMounted(() => {
  if (prefersReducedMotion()) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionEl.value,
      start: 'top 70%',
    },
  });

  tl.fromTo(
    [line1El.value, line2El.value, line3El.value],
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 },
  ).fromTo(paragraphEl.value, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.3');

  trigger = tl.scrollTrigger;
});

onUnmounted(() => {
  trigger?.kill();
});
</script>

<template>
  <section ref="sectionEl" class="sw-brand-intro">
    <div class="sw-brand-intro__lines">
      <span ref="line1El" class="sw-h1 sw-brand-intro__line">{{ locale.t('home.introLine1') }}</span>
      <span ref="line2El" class="sw-h1 sw-brand-intro__line">{{ locale.t('home.introLine2') }}</span>
      <span ref="line3El" class="sw-h1 sw-brand-intro__line sw-brand-intro__line--accent">{{ locale.t('home.introLine3') }}</span>
    </div>
    <p ref="paragraphEl" class="sw-body-lg sw-brand-intro__copy">{{ locale.t('home.introCopy') }}</p>
  </section>
</template>

<style scoped>
.sw-brand-intro {
  padding: clamp(96px, 14vw, 200px) var(--container-pad);
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 40px;
  align-items: end;
}

.sw-brand-intro__lines {
  display: flex;
  flex-direction: column;
}

.sw-brand-intro__line {
  display: block;
}

.sw-brand-intro__line--accent {
  color: var(--accent);
  font-style: italic;
}

.sw-brand-intro__copy {
  padding-bottom: 8px;
}

@media (max-width: 900px) {
  .sw-brand-intro {
    grid-template-columns: 1fr;
  }
}
</style>
