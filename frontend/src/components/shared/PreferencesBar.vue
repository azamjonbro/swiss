<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore, type CurrencyCode } from '@/stores/currency';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '@/i18n';
import ThemeIcon from '@/components/shared/ThemeIcon.vue';
import PrefDropdown from '@/components/shared/PrefDropdown.vue';

const theme = useThemeStore();
const locale = useLocaleStore();
const currency = useCurrencyStore();

const langOptions = computed(() => SUPPORTED_LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] })));
const currencyOptions = computed(() => currency.SUPPORTED.map((c) => ({ value: c, label: c })));

function setLang(value: string) {
  locale.setLang(value as Lang);
}

function setCurrency(value: string) {
  currency.setCode(value as CurrencyCode);
}
</script>

<template>
  <div class="sw-prefs">
    <button
      class="sw-prefs__icon"
      type="button"
      :aria-label="`${locale.t('prefs.theme')}: ${theme.mode === 'dark' ? locale.t('prefs.dark') : locale.t('prefs.light')}`"
      @click="theme.toggle"
    >
      <ThemeIcon :mode="theme.mode" />
    </button>

    <span class="sw-prefs__divider" aria-hidden="true" />

    <PrefDropdown :options="langOptions" :model-value="locale.lang" :label="locale.t('prefs.language')" @update:model-value="setLang" />

    <span class="sw-prefs__divider" aria-hidden="true" />

    <PrefDropdown :options="currencyOptions" :model-value="currency.code" :label="locale.t('prefs.currency')" @update:model-value="setCurrency" />
  </div>
</template>

<style scoped>
.sw-prefs {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sw-prefs__icon,
.sw-prefs__icon {
  display: inline-flex;
  align-items: center;
  color: currentColor;
  line-height: 1;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-prefs__icon:hover {
  opacity: 0.6;
}

.sw-prefs__divider {
  width: 1px;
  height: 11px;
  background: currentColor;
  opacity: 0.22;
  flex: none;
}
</style>
