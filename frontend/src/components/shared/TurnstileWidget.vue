<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';

/**
 * Cloudflare Turnstile, as a field the surrounding form can wait on.
 *
 * The component owns the whole lifecycle — loading the script once for the
 * page, rendering a widget, handing the token up, and resetting it after a
 * submission — so a form only has to bind `v-model` and refuse to submit
 * while the token is empty.
 *
 * A token is good for one submission. Every form here calls `reset()` through
 * its ref after a failed attempt, because re-sending a spent token is the
 * commonest way a second try fails for no visible reason.
 *
 * Without `VITE_TURNSTILE_SITE_KEY` the component renders nothing and reports
 * an empty token; the API is configured to match, waving requests through when
 * its own secret is unset, so a build made before the keys exist still works.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const model = defineModel<string>({ default: '' });

const locale = useLocaleStore();

const container = ref<HTMLDivElement | null>(null);
const hasError = ref(false);
let widgetId: string | undefined;

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** One script tag per page, however many widgets are mounted. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount try again rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function render() {
  if (!SITE_KEY || !container.value) return;

  try {
    await loadScript();
  } catch {
    hasError.value = true;
    return;
  }

  if (!window.turnstile || !container.value) return;

  widgetId = window.turnstile.render(container.value, {
    sitekey: SITE_KEY,
    // Turnstile takes the same two-letter codes the storefront uses.
    language: locale.lang,
    theme: 'auto',
    callback: (token: string) => {
      hasError.value = false;
      model.value = token;
    },
    // A token that expires while someone is still filling in the form must not
    // be submitted — clearing it puts the submit button back to disabled.
    'expired-callback': () => {
      model.value = '';
    },
    'error-callback': () => {
      model.value = '';
      hasError.value = true;
    },
  });
}

/** Clears the spent token and asks Cloudflare for a fresh one. */
function reset() {
  model.value = '';
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
}

defineExpose({ reset });

// The widget renders its own text, so a language change has to rebuild it.
watch(
  () => locale.lang,
  () => {
    if (!widgetId || !window.turnstile) return;
    window.turnstile.remove(widgetId);
    widgetId = undefined;
    model.value = '';
    void render();
  },
);

onMounted(() => void render());

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
  widgetId = undefined;
});
</script>

<template>
  <div v-if="SITE_KEY" class="sw-turnstile">
    <div ref="container" />
    <p v-if="hasError" class="sw-turnstile__error">{{ locale.t('account.captchaFailed') }}</p>
  </div>
</template>

<style scoped>
.sw-turnstile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* The widget sizes itself; this only stops it stretching a flex column. */
  align-items: flex-start;
}

.sw-turnstile__error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--sw-crimson, #ad2b39);
}
</style>
