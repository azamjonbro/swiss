import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { setSeoLang } from '@/utils/seo';
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
/** Used when nothing else resolves — the storefront's home market. */
const FALLBACK_LANG: Lang = 'uz';

function readStored(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : null;
  } catch {
    // Private mode / storage disabled. Not a reason to fail to pick a language.
    return null;
  }
}

/**
 * The language to open in when the visitor has not chosen one yet.
 *
 * This used to be a constant `'uz'`, which had an SEO consequence that was easy
 * to miss: a crawler has no stored preference, so every page Google rendered
 * came out in Uzbek — while the prerendered HTML it was compared against, the
 * <title>, the meta description and the JSON-LD were all English. The page and
 * its own structured data disagreed about what language they were in.
 *
 * Reading the browser's preference fixes both halves at once. Googlebot renders
 * with an English locale and now stays on the English copy the metadata
 * describes, and a Russian- or Uzbek-speaking visitor gets their own language
 * instead of one hardcoded guess. A stored choice still wins over both.
 */
function preferredLang(): Lang {
  const stored = readStored();
  if (stored) return stored;

  const candidates =
    typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? []), navigator.language].filter(Boolean);

  for (const tag of candidates) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return FALLBACK_LANG;
}

function readNested(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

export const useLocaleStore = defineStore('locale', () => {
  const lang = ref<Lang>(preferredLang());
  const dictionary = ref<Dictionary | null>(null);

  watch(
    lang,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        /* storage disabled — the choice just does not survive the session */
      }
      document.documentElement.setAttribute('lang', value);
      // Keeps `og:locale` describing the language the page is actually in.
      setSeoLang(value);
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
