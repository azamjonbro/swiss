<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useLocaleStore } from '@/stores/locale';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '@/i18n';
import ThemeIcon from '@/components/shared/ThemeIcon.vue';
import PrefDropdown from '@/components/shared/PrefDropdown.vue';

const theme = useThemeStore();
const locale = useLocaleStore();

const langOptions = computed(() => SUPPORTED_LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] })));

function setLang(value: string) {
  locale.setLang(value as Lang);
}
</script>

<template>
  <div class="sw-admin-prefs">
    <button
      class="sw-admin-prefs__theme"
      type="button"
      :aria-label="`${locale.t('prefs.theme')}: ${theme.mode === 'dark' ? locale.t('prefs.dark') : locale.t('prefs.light')}`"
      @click="theme.toggle"
    >
      <ThemeIcon :mode="theme.mode" :size="14" />
    </button>
    <PrefDropdown
      :options="langOptions"
      :model-value="locale.lang"
      :label="locale.t('prefs.language')"
      surface="admin"
      @update:model-value="setLang"
    />
  </div>
</template>

<style scoped>
.sw-admin-prefs {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sw-admin-prefs__theme {
  display: inline-flex;
  align-items: center;
  color: var(--admin-text-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-admin-prefs__theme:hover {
  color: var(--admin-text);
}
</style>
