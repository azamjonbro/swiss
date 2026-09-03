<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import type { RangePreset } from '@/types/analytics';
import { rangeFor, today } from '@/utils/dateRange';

/**
 * Date range control: four presets plus a custom window.
 *
 * Dates are plain `YYYY-MM-DD` strings throughout — never `Date` objects —
 * because that is what the API takes and what a calendar day actually is. A
 * timestamp would drag a timezone into a value that has none.
 */
const props = defineProps<{ from: string; to: string; preset: RangePreset; busy?: boolean }>();
const emit = defineEmits<{ change: [{ from: string; to: string; preset: RangePreset }] }>();

const locale = useLocaleStore();

const customFrom = ref(props.from);
const customTo = ref(props.to);

watch(
  () => [props.from, props.to],
  ([from, to]) => {
    customFrom.value = from;
    customTo.value = to;
  },
);

const presets = computed<{ value: RangePreset; label: string }[]>(() => [
  { value: 'today', label: locale.t('admin.analyticsToday') },
  { value: '7d', label: locale.t('admin.analytics7d') },
  { value: '30d', label: locale.t('admin.analytics30d') },
  { value: '90d', label: locale.t('admin.analytics90d') },
  { value: 'custom', label: locale.t('admin.analyticsCustom') },
]);

function selectPreset(preset: RangePreset) {
  if (preset === 'custom') {
    emit('change', { from: customFrom.value, to: customTo.value, preset });
    return;
  }
  emit('change', { ...rangeFor(preset), preset });
}

function applyCustom() {
  if (!customFrom.value || !customTo.value) return;
  // Swap rather than reject: the intent is unambiguous and an error here would
  // be pedantry, not help.
  const [from, to] =
    customFrom.value <= customTo.value
      ? [customFrom.value, customTo.value]
      : [customTo.value, customFrom.value];
  emit('change', { from, to, preset: 'custom' });
}

const maxDate = computed(() => today());
</script>

<template>
  <div class="sw-range">
    <div class="sw-range__presets" role="group" :aria-label="locale.t('admin.analyticsRange')">
      <button v-for="option in presets" :key="option.value" type="button" class="sw-range__btn"
        :class="{ 'is-active': preset === option.value }" :aria-pressed="preset === option.value" :disabled="busy"
        @click="selectPreset(option.value)">
        {{ option.label }}
      </button>
    </div>

    <div v-if="preset === 'custom'" class="sw-range__custom">
      <label class="sw-range__field">
        <span>{{ locale.t('admin.analyticsFrom') }}</span>
        <input v-model="customFrom" type="date" :max="maxDate" @change="applyCustom" />
      </label>
      <label class="sw-range__field">
        <span>{{ locale.t('admin.analyticsTo') }}</span>
        <input v-model="customTo" type="date" :max="maxDate" @change="applyCustom" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.sw-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.sw-range__presets {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
}

.sw-range__btn {
  appearance: none;
  border: none;
  background: none;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 550;
  color: var(--admin-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-range__btn:hover:not(:disabled) {
  color: var(--admin-text);
  background: var(--admin-surface-3);
}

.sw-range__btn.is-active {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.sw-range__btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.sw-range__custom {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sw-range__field {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.76rem;
  color: var(--admin-text-subtle);
}

.sw-range__field input {
  font: inherit;
  font-size: 0.8rem;
  color: var(--admin-text);
  padding: 6px 9px;
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-sm);
  background: var(--admin-surface);
}

.sw-range__field input:focus-visible {
  outline: none;
  border-color: var(--admin-accent);
  box-shadow: var(--shadow-ring);
}
</style>
