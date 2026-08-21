import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { dictionaries, SUPPORTED_LANGS, type Lang } from '@/i18n';

const STORAGE_KEY = 'sw-lang';

function readStored(): Lang | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && (SUPPORTED_LANGS as string[]).includes(stored) ? (stored as Lang) : null;
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

  function setLang(next: Lang) {
    lang.value = next;
  }

  watch(
    lang,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value);
      document.documentElement.setAttribute('lang', value);
    },
    { immediate: true },
  );

  function t(key: string): string {
    return (
      readNested(dictionaries[lang.value], key) ?? readNested(dictionaries.en, key) ?? key
    );
  }

  return { lang, setLang, t };
});
