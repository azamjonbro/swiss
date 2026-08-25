<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';

const ui = useUiStore();
const locale = useLocaleStore();
</script>

<template>
  <section class="sw-cta">
    <div class="sw-cta__inner">
      <span v-reveal class="sw-eyebrow sw-cta__eyebrow">{{ locale.t('cta.eyebrow') }}</span>
      <h2 v-reveal="0.08" class="sw-h1 sw-cta__title">{{ locale.t('cta.title') }}</h2>

      <div v-reveal="0.18" class="sw-cta__actions">
        <RouterLink class="sw-btn" to="/watches">
          {{ locale.t('cta.explore') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </RouterLink>
        <span class="sw-cta__divider" aria-hidden="true" />
        <button class="sw-btn" type="button" @click="ui.openInquiry()">
          {{ locale.t('cta.request') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sw-cta {
  padding-block: var(--space-section);
  background: var(--sw-obsidian);
  color: var(--sw-white);
}

.sw-cta__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
  display: grid;
  justify-items: center;
  text-align: center;
}

.sw-cta__eyebrow {
  color: rgba(253, 252, 250, 0.5);
}

.sw-cta__title {
  margin-top: 32px;
  max-width: 18ch;
}

.sw-cta__actions {
  margin-top: clamp(48px, 6vw, 76px);
  display: flex;
  align-items: center;
  gap: clamp(28px, 4vw, 56px);
  flex-wrap: wrap;
  justify-content: center;
}

.sw-cta__divider {
  width: 1px;
  height: 22px;
  background: rgba(253, 252, 250, 0.22);
}

@media (max-width: 560px) {
  .sw-cta__actions {
    flex-direction: column;
    gap: 26px;
  }

  .sw-cta__divider {
    width: 40px;
    height: 1px;
  }
}
</style>
