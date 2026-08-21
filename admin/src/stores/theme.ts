import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'sw-theme';

function readStored(): ThemeMode | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStored() ?? (systemPrefersDark() ? 'dark' : 'light'));

  function setMode(next: ThemeMode) {
    mode.value = next;
  }

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
  }

  watch(
    mode,
    (value) => {
      document.documentElement.setAttribute('data-theme', value);
      localStorage.setItem(STORAGE_KEY, value);
    },
    { immediate: true },
  );

  return { mode, setMode, toggle };
});
