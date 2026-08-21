<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import type { Category } from '@/types/models';
import CategoryCard from '@/components/category/CategoryCard.vue';

interface Props {
  categories: Category[];
}

defineProps<Props>();

const sectionEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);

let mm: gsap.MatchMedia | undefined;

onMounted(() => {
  mm = gsap.matchMedia();

  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    if (!sectionEl.value || !trackEl.value) return;

    const distance = () => trackEl.value!.scrollWidth - window.innerWidth;

    const tween = gsap.to(trackEl.value, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: sectionEl.value,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
});

onUnmounted(() => {
  mm?.revert();
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger === sectionEl.value) st.kill();
  });
});
</script>

<template>
  <section ref="sectionEl" class="sw-hcat">
    <div ref="trackEl" class="sw-hcat__track">
      <CategoryCard v-for="(category, index) in categories" :key="category._id" :category="category" :index="index" />
    </div>
  </section>
</template>

<style scoped>
.sw-hcat {
  position: relative;
  height: 100svh;
  overflow: hidden;
}

.sw-hcat__track {
  display: flex;
  height: 100%;
  width: max-content;
  will-change: transform;
}

@media (max-width: 899px) {
  .sw-hcat {
    height: auto;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .sw-hcat__track {
    height: 80vh;
    min-height: 480px;
  }

  .sw-hcat :deep(.sw-cat-card) {
    scroll-snap-align: start;
  }
}
</style>
