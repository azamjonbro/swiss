import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { api } from '@/services/api';
import { useAccountStore } from '@/stores/account';
import type { Watch } from '@/types/models';
import { trackGoal } from '@/utils/analytics';

/**
 * Saved timepieces live on the customer's account, so this store mirrors the
 * server list rather than persisting anything locally — signing out on one
 * device must not leave a stale wishlist behind on another.
 */
export const useSavedStore = defineStore('saved', () => {
  const account = useAccountStore();

  const ids = ref<string[]>([]);
  const items = ref<Watch[]>([]);
  const isLoadingItems = ref(false);
  const pendingId = ref<string | null>(null);

  const count = computed(() => ids.value.length);
  const idSet = computed(() => new Set(ids.value));

  function has(watchId: string) {
    return idSet.value.has(watchId);
  }

  function reset() {
    ids.value = [];
    items.value = [];
  }

  async function loadIds() {
    if (!account.isAuthenticated) return reset();
    const { data } = await api.get('/account/saved/ids');
    ids.value = data.savedIds ?? [];
  }

  async function loadItems() {
    if (!account.isAuthenticated) return reset();
    isLoadingItems.value = true;
    try {
      const { data } = await api.get('/account/saved');
      items.value = data.items ?? [];
      ids.value = items.value.map((w) => w._id);
    } finally {
      isLoadingItems.value = false;
    }
  }

  /** Returns false when the caller needs to send the visitor to sign-in first. */
  async function toggle(watchId: string): Promise<boolean> {
    if (!account.isAuthenticated) return false;

    pendingId.value = watchId;
    try {
      if (has(watchId)) {
        const { data } = await api.delete(`/account/saved/${watchId}`);
        ids.value = data.savedIds ?? [];
        items.value = items.value.filter((w) => w._id !== watchId);
      } else {
        const { data } = await api.post('/account/saved', { watchId });
        ids.value = data.savedIds ?? [];
        // On a storefront with no checkout, saving a piece is the clearest
        // signal of intent short of an inquiry.
        trackGoal('product_saved', watchId);
      }
      return true;
    } finally {
      pendingId.value = null;
    }
  }

  // Keeps the wishlist in step with the session for the lifetime of the app —
  // the store is instantiated once in App.vue so this watcher is always live.
  watch(
    () => account.isAuthenticated,
    (authed) => {
      if (authed) void loadIds();
      else reset();
    },
    { immediate: true },
  );

  return { ids, items, count, isLoadingItems, pendingId, has, reset, loadIds, loadItems, toggle };
});
