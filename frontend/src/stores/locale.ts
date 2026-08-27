import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import {
  isLang,
  loadDictionary,
  loadedDictionary,
  prefetchDictionaries,
  SUPPORTED_LANGS,
  type Dictionary,
  type Lang,
} from '@/i18n';

const STORAGE_KEY = 'sw-lang';

function readStored(): Lang | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLang(stored) ? stored : null;
}

function readNested(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

export const useLocaleStore = defineStore('locale', () => {
  const lang = ref<Lang>(readStored() ?? 'uz');
  const dictionary = ref<Dictionary | null>(null);

  watch(
    lang,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value);
      document.documentElement.setAttribute('lang', value);
    },
    { immediate: true },
  );

  /**
   * Resolves once the active dictionary is in memory. `main.ts` awaits this
   * before mounting, so the first render never paints raw translation keys.
   */
  async function ready(): Promise<void> {
    dictionary.value = await loadDictionary(lang.value);
  }

  /**
   * Switches language. The dictionary is swapped in the same tick as `lang`,
   * so the UI never shows one locale's chrome around another's copy — with the
   * dictionaries prefetched on idle this resolves without a network round trip.
   */
  async function setLang(next: Lang) {
    if (next === lang.value || !SUPPORTED_LANGS.includes(next)) return;
    const dict = await loadDictionary(next);
    dictionary.value = dict;
    lang.value = next;
  }

  /** Warms the other dictionaries — call on idle, or on switcher hover. */
  function prefetch() {
    prefetchDictionaries(lang.value);
  }

  function t(key: string): string {
    const active = dictionary.value;
    if (active) {
      const hit = readNested(active, key);
      if (hit !== undefined) return hit;
    }
    // English is the dictionary every key is written in first, so it is the
    // fallback — but only if it is already loaded. Never worth a blocking
    // fetch to resolve one missing string.
    const fallback = loadedDictionary('en');
    if (fallback && fallback !== active) {
      const hit = readNested(fallback, key);
      if (hit !== undefined) return hit;
    }
    return key;
  }

  return { lang, dictionary, ready, setLang, prefetch, t };
});
