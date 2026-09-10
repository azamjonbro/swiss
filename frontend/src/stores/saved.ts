import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { api } from '@/services/api';
import { fetchWatchesByIds } from '@/services/watches';
import { useAccountStore } from '@/stores/account';
import type { Watch } from '@/types/models';
import { trackGoal } from '@/utils/analytics';

const STORAGE_KEY = 'sw-saved-v1';

/**
 * A wishlist longer than this is not a wishlist. The cap also bounds the
 * `?ids=` query the saved page sends (the server refuses more than 200).
 */
const MAX_SAVED = 120;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Saved timepieces, kept on the device first.
 *
 * They used to live only on the customer's account, which meant tapping a
 * heart threw the visitor at a sign-up form before they had decided they
 * wanted anything — a registration wall in front of the lightest gesture on
 * the site. The list is now local: it works signed out, survives a reload, and
 * costs nothing to start.
 *
 * An account is still worth having, so signing in *folds* the device's list
 * into the account rather than replacing it, and every later change is
 * mirrored to the server so the list follows the visitor to another device.
 * Signing out clears the device (`reset`) — a shared computer must not keep
 * someone else's wishlist.
 */
export const useSavedStore = defineStore('saved', () => {
  const account = useAccountStore();

  const ids = ref<string[]>(load());
  const items = ref<Watch[]>([]);
  const isLoadingItems = ref(false);
  const pendingId = ref<string | null>(null);

  const count = computed(() => ids.value.length);
  const idSet = computed(() => new Set(ids.value));

  watch(
    ids,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage can be unavailable (private mode, quota). The list still
        // works for the session, it just won't survive a reload.
      }
    },
    { deep: true },
  );

  function has(watchId: string) {
    return idSet.value.has(watchId);
  }

  /** Wipes the list on this device. Sign-out, not un-saving. */
  function reset() {
    ids.value = [];
    items.value = [];
  }

  /**
   * Pushes anything saved before signing in up to the account, then adopts the
   * union. Whichever device saved a piece, it is still saved afterwards —
   * signing in never costs the visitor a wishlist.
   */
  async function mergeIntoAccount() {
    const local = [...ids.value];
    const { data } = await api.get('/account/saved/ids');
    let remote: string[] = data.savedIds ?? [];

    for (const watchId of local) {
      if (remote.includes(watchId)) continue;
      const { data: added } = await api.post('/account/saved', { watchId });
      remote = added.savedIds ?? [...remote, watchId];
    }

    ids.value = remote;
  }

  async function loadItems() {
    isLoadingItems.value = true;
    try {
      if (account.isAuthenticated) {
        const { data } = await api.get('/account/saved');
        items.value = data.items ?? [];
      } else {
        items.value = await fetchWatchesByIds(ids.value);
      }
      // Both sources drop what no longer exists, so this is also how a
      // withdrawn product leaves the list instead of sitting in the count as a
      // row that can never be drawn.
      ids.value = items.value.map((w) => w._id);
    } finally {
      isLoadingItems.value = false;
    }
  }

  /**
   * Flips the heart. Local first, so it is instant and needs no account; a
   * signed-in visitor additionally mirrors the change to the server.
   */
  async function toggle(watchId: string) {
    const wasSaved = has(watchId);

    if (wasSaved) {
      ids.value = ids.value.filter((id) => id !== watchId);
      items.value = items.value.filter((w) => w._id !== watchId);
    } else {
      // Newest last, matching the order the account stores them in, so the
      // list does not reshuffle itself the moment the visitor signs in.
      ids.value = [...ids.value, watchId].slice(-MAX_SAVED);
      // On a storefront with no checkout, saving a piece is the clearest
      // signal of intent short of an inquiry.
      trackGoal('product_saved', watchId);
    }

    if (!account.isAuthenticated) return;

    pendingId.value = watchId;
    try {
      if (wasSaved) await api.delete(`/account/saved/${watchId}`);
      else await api.post('/account/saved', { watchId });
    } catch {
      // The device's own list is the one the visitor is looking at; a failed
      // mirror is reconciled the next time the account list is merged.
    } finally {
      pendingId.value = null;
    }
  }

  // Signing in folds the device's list into the account. There is deliberately
  // no `else` branch: the watcher also fires with `false` on every cold start,
  // before the session has been restored, and clearing there would wipe the
  // list of every visitor who is not signed in. Sign-out calls `reset()`
  // explicitly instead.
  watch(
    () => account.isAuthenticated,
    (authed) => {
      if (authed) void mergeIntoAccount();
    },
    { immediate: true },
  );

  return { ids, items, count, isLoadingItems, pendingId, has, reset, loadItems, toggle };
});
