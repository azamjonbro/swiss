<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useSavedStore } from '@/stores/saved';
import WatchCard from '@/components/watch/WatchCard.vue';

const locale = useLocaleStore();
const saved = useSavedStore();

const hasError = ref(false);

onMounted(async () => {
  try {
    await saved.loadItems();
  } catch {
    hasError.value = true;
  }
});

async function remove(watchId: string) {
  try {
    await saved.toggle(watchId);
  } catch {
    hasError.value = true;
  }
}
</script>

<template>
  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.savedTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.savedLede') }}</p>

    <p v-if="saved.isLoadingItems" class="sw-body" style="margin-top: 32px">{{ locale.t('account.loading') }}</p>

    <p v-else-if="hasError" class="sw-body" style="margin-top: 32px">{{ locale.t('account.errorGeneric') }}</p>

    <div v-else-if="!saved.items.length" class="sw-account__empty">
      <h3 class="sw-account__empty-title">{{ locale.t('account.savedEmptyTitle') }}</h3>
      <p class="sw-body sw-account__empty-body">{{ locale.t('account.savedEmptyBody') }}</p>
      <RouterLink class="sw-btn sw-account__empty-cta" to="/watches">
        {{ locale.t('account.browseWatches') }} <span class="sw-btn__arrow">&rarr;</span>
      </RouterLink>
    </div>

    <ul v-else class="sw-saved-grid">
      <li v-for="watch in saved.items" :key="watch._id" class="sw-saved-grid__item">
        <WatchCard :watch="watch" />
        <button
          class="sw-saved-grid__remove"
          type="button"
          :disabled="saved.pendingId === watch._id"
          @click="remove(watch._id)"
        >
          {{ locale.t('account.removeSaved') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sw-saved-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: clamp(28px, 4vw, 56px) clamp(20px, 2.5vw, 36px);
  margin-top: 40px;
}

.sw-saved-grid__item {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-saved-grid__remove {
  align-self: flex-start;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-saved-grid__remove:hover:not([disabled]) {
  color: var(--accent);
}

.sw-saved-grid__remove[disabled] {
  opacity: 0.4;
}
</style>
