import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'sw-theme';

function readStored(): ThemeMode | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/**
 * Light is the house default, not the operating system's preference. The
 * storefront is a photographic catalogue: the ivory ground is what the product
 * photography, the serif display type and the crimson mark were all set
 * against, and a visitor whose laptop happens to be in dark mode was being
 * shown the alternate reading of the site as if it were the intended one.
 * Dark remains one tap away in the preferences bar, and a visitor who chooses
 * it keeps it — `readStored()` still wins.
 */
const DEFAULT_MODE: ThemeMode = 'light';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStored() ?? DEFAULT_MODE);

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
