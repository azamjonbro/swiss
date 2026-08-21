<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  modelValue: string;
  label: string;
  /**
   * Panel color scheme: 'light' follows the storefront's theme-aware bg/text
   * tokens, 'dark' is a fixed dark surface (the always-dark full-screen menu),
   * 'admin' uses the admin panel's own --admin-* tokens so it never borrows
   * the storefront's palette.
   */
  surface?: 'light' | 'dark' | 'admin';
  /** Compact header-style trigger typography (uppercase, letter-spaced) vs. the larger menu-style label. */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), { surface: 'light', compact: true });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const currentLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? props.modelValue);

function select(value: string) {
  emit('update:modelValue', value);
  isOpen.value = false;
}

function onDocClick(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) isOpen.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isOpen.value = false;
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="rootEl" class="sw-pref-dd" :class="[`is-${surface}`, { 'is-compact': compact }]">
    <button
      class="sw-pref-dd__trigger"
      type="button"
      :aria-label="label"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      {{ currentLabel }}
      <svg class="sw-pref-dd__caret" :class="{ 'is-open': isOpen }" viewBox="0 0 10 6" width="8" height="5" aria-hidden="true">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <transition name="sw-pref-dd-fade">
      <ul v-if="isOpen" class="sw-pref-dd__list" role="listbox">
        <li v-for="opt in options" :key="opt.value">
          <button
            type="button"
            class="sw-pref-dd__option"
            :class="{ 'is-active': opt.value === modelValue }"
            role="option"
            :aria-selected="opt.value === modelValue"
            @click="select(opt.value)"
          >
            {{ opt.label }}
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.sw-pref-dd {
  position: relative;
}

.sw-pref-dd__trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  line-height: 1;
  color: inherit;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-pref-dd__trigger:hover {
  opacity: 0.6;
}

.sw-pref-dd.is-compact .sw-pref-dd__trigger {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.sw-pref-dd:not(.is-compact) .sw-pref-dd__trigger {
  font-size: 0.9rem;
  gap: 8px;
}

.sw-pref-dd__caret {
  transition: transform var(--dur-fast) var(--ease-out);
  flex: none;
}

.sw-pref-dd__caret.is-open {
  transform: rotate(180deg);
}

.sw-pref-dd__list {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 92px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
  box-shadow: 0 12px 32px rgba(10, 10, 10, 0.14);
}

.sw-pref-dd__option {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  color: var(--text-muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.sw-pref-dd__option:hover {
  background: var(--border);
  color: var(--text);
}

.sw-pref-dd__option.is-active {
  color: var(--accent);
}

.sw-pref-dd.is-dark .sw-pref-dd__list {
  background: var(--sw-charcoal);
  color: var(--sw-white);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.sw-pref-dd.is-dark .sw-pref-dd__option {
  color: var(--sw-gray-200);
}

.sw-pref-dd.is-dark .sw-pref-dd__option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--sw-white);
}

.sw-pref-dd.is-dark .sw-pref-dd__option.is-active {
  color: var(--sw-burgundy-light);
}

.sw-pref-dd.is-admin .sw-pref-dd__trigger {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  font-size: 0.85rem;
  color: var(--admin-text);
}

.sw-pref-dd.is-admin .sw-pref-dd__list {
  background: var(--admin-surface);
  color: var(--admin-text);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 28px rgba(20, 20, 20, 0.12);
}

.sw-pref-dd.is-admin .sw-pref-dd__option {
  text-transform: none;
  letter-spacing: 0.01em;
  font-weight: 500;
  border-radius: var(--radius-sm);
  color: var(--admin-text-muted);
}

.sw-pref-dd.is-admin .sw-pref-dd__option:hover {
  background: var(--admin-bg);
  color: var(--admin-text);
}

.sw-pref-dd.is-admin .sw-pref-dd__option.is-active {
  color: var(--admin-accent);
}

.sw-pref-dd-fade-enter-active,
.sw-pref-dd-fade-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.sw-pref-dd-fade-enter-from,
.sw-pref-dd-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.sw-pref-dd:not(.is-compact) .sw-pref-dd__list {
  left: 0;
  transform: none;
}

.sw-pref-dd:not(.is-compact) .sw-pref-dd-fade-enter-from,
.sw-pref-dd:not(.is-compact) .sw-pref-dd-fade-leave-to {
  transform: translateY(-4px);
}
</style>
