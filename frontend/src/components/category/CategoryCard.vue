<script setup lang="ts">
import type { Category } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  category?: Category;
  variant?: 'default' | 'view-all';
}

withDefaults(defineProps<Props>(), { variant: 'default' });
const locale = useLocaleStore();
</script>

<template>
  <article class="sw-cat-card" :class="{ 'is-view-all': variant === 'view-all' }">
    <RouterLink
      v-if="variant === 'default' && category"
      :to="`/watches?category=${category.slug}`"
      class="sw-cat-card__link"
      data-cursor="View"
    >
      <div class="sw-cat-card__media">
        <SmartImage :src="category.image" :alt="category.name" aspect-ratio="3 / 4" />
      </div>
      <div class="sw-cat-card__foot">
        <span class="sw-cat-card__name">{{ category.name }}</span>
        <svg class="sw-cat-card__chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
          <path d="M1 5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </RouterLink>

    <RouterLink v-else to="/brands" class="sw-cat-card__link sw-cat-card__link--all" data-cursor="View">
      <div class="sw-cat-card__media">
        <SmartImage src="/images/swisswatch_provenance.jpg" :alt="locale.t('category.viewAll')" aspect-ratio="3 / 4" />
        <div class="sw-cat-card__overlay" />
      </div>
      <div class="sw-cat-card__all-content">
        <span class="sw-cat-card__mark">S</span>
        <span class="sw-cat-card__all-title">{{ locale.t('category.viewAll') }}</span>
        <span class="sw-cat-card__all-caption">{{ locale.t('category.viewAllCaption') }}</span>
      </div>
    </RouterLink>
  </article>
</template>

<style scoped>
.sw-cat-card {
  flex: 0 0 clamp(260px, 28vw, 360px);
  scroll-snap-align: start;
}

.sw-cat-card__link {
  display: block;
}

.sw-cat-card__media {
  position: relative;
  overflow: hidden;
  background: var(--sw-gray-200);
}

.sw-cat-card__media :deep(.sw-smart-image__img) {
  transition: transform 1.1s var(--ease-luxury);
}

.sw-cat-card__link:hover .sw-cat-card__media :deep(.sw-smart-image__img) {
  transform: scale(1.05);
}

.sw-cat-card__foot {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sw-cat-card__name {
  font-family: var(--font-serif);
  font-size: 1.05rem;
}

.sw-cat-card__chevron {
  color: var(--text-muted);
  flex: none;
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-cat-card__link:hover .sw-cat-card__chevron {
  transform: translateY(-3px);
  color: var(--text);
}

/* View-all variant */
.sw-cat-card.is-view-all .sw-cat-card__link--all {
  position: relative;
  height: 100%;
}

.sw-cat-card.is-view-all .sw-cat-card__media {
  height: 100%;
}

.sw-cat-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.35) 0%, rgba(10, 10, 10, 0.72) 100%);
}

.sw-cat-card__all-content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 24px;
  color: var(--sw-white);
}

.sw-cat-card__mark {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--sw-burgundy-light);
}

.sw-cat-card__all-title {
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sw-cat-card__all-caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  color: var(--sw-gray-200);
}
</style>
