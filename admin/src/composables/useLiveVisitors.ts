import { ref, onMounted, onUnmounted } from 'vue';
import { fetchAnalyticsLive } from '@/services/analytics';
import type { AnalyticsLive } from '@/types/analytics';

/** Matches the backend's live cache TTL, so a poll never lands on a stale entry. */
const INTERVAL_MS = 15_000;
/** Ceiling for the backoff after repeated failures. */
const MAX_INTERVAL_MS = 2 * 60_000;

/**
 * Polls the live-visitors endpoint while the dashboard is actually being looked at.
 *
 * The site has no WebSocket layer and adding one for a panel with at most a
 * couple of viewers would not pay for itself, so this polls — but it is
 * careful about when:
 *
 *   - it stops entirely while the tab is hidden. An admin panel left open in a
 *     background tab for a week would otherwise spend the site's DataFast
 *     request budget on a screen nobody is reading, and refresh immediately on
 *     return so the first visible frame is current;
 *   - it backs off exponentially on failure rather than hammering an endpoint
 *     that is already rate-limited, which is the one thing that would keep it
 *     rate-limited.
 */
export function useLiveVisitors() {
  const data = ref<AnalyticsLive | null>(null);
  const isLoading = ref(true);
  const hasError = ref(false);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let failures = 0;
  let stopped = false;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    clearTimer();
    if (stopped || document.hidden) return;
    // 15s, then 30s, 60s, 120s while the endpoint keeps failing.
    const delay = Math.min(INTERVAL_MS * 2 ** failures, MAX_INTERVAL_MS);
    timer = setTimeout(() => void poll(), delay);
  }

  async function poll() {
    if (stopped || document.hidden) return;

    controller?.abort();
    controller = new AbortController();

    try {
      data.value = await fetchAnalyticsLive(controller.signal);
      hasError.value = false;
      failures = 0;
    } catch (err) {
      // An aborted request is this composable tearing down or superseding its
      // own call — not a failure of the endpoint, and not the user's problem.
      if (!isAbort(err)) {
        hasError.value = true;
        failures = Math.min(failures + 1, 3);
      }
    } finally {
      isLoading.value = false;
      schedule();
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      clearTimer();
      controller?.abort();
    } else {
      void poll();
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void poll();
  });

  onUnmounted(() => {
    stopped = true;
    clearTimer();
    controller?.abort();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  return { data, isLoading, hasError };
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { name, code } = err as { name?: string; code?: string };
  return name === 'CanceledError' || name === 'AbortError' || code === 'ERR_CANCELED';
}
