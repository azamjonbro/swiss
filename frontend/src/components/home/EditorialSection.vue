<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  ctaLabel?: string;
  ctaTo?: string;
  reverse?: boolean;
}

withDefaults(defineProps<Props>(), { reverse: false, ctaLabel: undefined, ctaTo: undefined });

const sectionEl = ref<HTMLElement | null>(null);
const imageEl = ref<HTMLElement | null>(null);
const textEl = ref<HTMLElement | null>(null);

let trigger: ScrollTrigger | undefined;

onMounted(() => {
  if (prefersReducedMotion()) return;

  const tl = gsap.timeline({
    scrollTrigger: { trigger: sectionEl.value, start: 'top 75%' },
  });

  tl.fromTo(imageEl.value, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }).fromTo(
    textEl.value,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
    '-=0.7',
  );

  trigger = tl.scrollTrigger;
});

onUnmounted(() => trigger?.kill());
</script>

<template>
  <section ref="sectionEl" class="sw-editorial" :class="{ 'is-reverse': reverse }">
    <div ref="imageEl" class="sw-editorial__media">
      <SmartImage :src="image" :alt="title" aspect-ratio="4 / 5" sizes="(max-width: 860px) 92vw, 46vw" />
    </div>
    <div ref="textEl" class="sw-editorial__text">
      <span class="sw-eyebrow">{{ eyebrow }}</span>
      <h2 class="sw-h1">{{ title }}</h2>
      <p class="sw-body-lg">{{ body }}</p>
      <RouterLink v-if="ctaLabel && ctaTo" class="sw-btn" :to="ctaTo">
        {{ ctaLabel }} <span class="sw-btn__arrow">&rarr;</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.sw-editorial {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: clamp(32px, 6vw, 96px);
  padding: clamp(64px, 9vw, 140px) var(--container-pad);
}

.sw-editorial.is-reverse {
  direction: rtl;
}

.sw-editorial.is-reverse > * {
  direction: ltr;
}

.sw-editorial__text {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

.sw-editorial__text .sw-btn {
  margin-top: 12px;
  width: fit-content;
}

@media (max-width: 860px) {
  .sw-editorial,
  .sw-editorial.is-reverse {
    grid-template-columns: 1fr;
    direction: ltr;
  }
}
</style>
