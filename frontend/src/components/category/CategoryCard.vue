<script setup lang="ts">
import type { Category } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import SmartVideo from '@/components/shared/SmartVideo.vue';

interface Props {
  category: Category;
  index: number;
}

defineProps<Props>();
const locale = useLocaleStore();
</script>

<template>
  <article class="sw-cat-card">
    <RouterLink :to="`/watches?category=${category.slug}`" class="sw-cat-card__link" data-cursor="View">
      <div class="sw-cat-card__media">
        <SmartVideo
          :src="category.video"
          :poster="category.image"
          :alt="category.name"
          playback-strategy="viewport"
        />
        <div class="sw-cat-card__overlay" />
      </div>

      <div class="sw-cat-card__content">
        <span class="sw-eyebrow sw-cat-card__index">{{ locale.t('category.label') }} {{ String(index + 1).padStart(2, '0') }}</span>
        <h3 class="sw-display sw-cat-card__title">{{ category.name }}</h3>
        <p class="sw-body-lg sw-cat-card__tagline">{{ category.tagline }}</p>
        <span class="sw-btn sw-cat-card__cta">{{ locale.t('category.discover') }} <span class="sw-btn__arrow">&rarr;</span></span>
      </div>
    </RouterLink>
  </article>
</template>

<style scoped>
.sw-cat-card {
  position: relative;
  flex: 0 0 100vw;
  width: 100vw;
  height: 100%;
}

.sw-cat-card__link {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  color: var(--sw-white);
}

.sw-cat-card__media {
  position: absolute;
  inset: 0;
}

.sw-cat-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.1) 0%, rgba(10, 10, 10, 0.7) 100%);
}

.sw-cat-card__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 var(--container-pad) 100px;
  max-width: 720px;
}

.sw-cat-card__index {
  color: var(--sw-gray-200);
}

.sw-cat-card__title {
  color: var(--sw-white);
  transition: transform var(--dur-mid) var(--ease-luxury);
}

.sw-cat-card__link:hover .sw-cat-card__title {
  transform: translateX(8px);
}

.sw-cat-card__tagline {
  color: var(--sw-gray-200);
  font-style: italic;
}

.sw-cat-card__cta {
  color: var(--sw-white);
  margin-top: 8px;
  width: fit-content;
}

@media (max-width: 640px) {
  .sw-cat-card__content {
    padding: 0 20px 64px;
  }
}
</style>
