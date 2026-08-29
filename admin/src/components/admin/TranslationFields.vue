<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import {
  TRANSLATION_LANGS,
  type Translations,
  type TranslationLang,
  type TranslationField,
} from '@/types/models';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const props = defineProps<{
  fields: TranslationField[];
  /** The English values, shown as placeholders so it is clear what is being translated. */
  base?: Record<string, string | undefined>;
}>();

const model = defineModel<Translations>({ required: true });

const locale = useLocaleStore();
const activeLang = ref<TranslationLang>('ru');

const langLabel = computed(() => (lang: TranslationLang) => locale.t(lang === 'ru' ? 'admin.langRu' : 'admin.langUz'));

function valueOf(lang: TranslationLang, key: string): string {
  return model.value[lang]?.[key] ?? '';
}

function setValue(lang: TranslationLang, key: string, value: string) {
  // Replace the whole object so the parent's `form` ref sees the change even
  // when it was handed a fresh empty translations object.
  model.value = { ...model.value, [lang]: { ...model.value[lang], [key]: value } };
}

function filledCount(lang: TranslationLang): number {
  return props.fields.filter((f) => valueOf(lang, f.key).trim()).length;
}
</script>

<template>
  <section class="sw-tr">
    <header class="sw-tr__head">
      <span class="sw-tr__icon"><AdminIcon name="globe" :size="15" /></span>
      <div>
        <p class="sw-tr__title">{{ locale.t('admin.translations') }}</p>
        <p class="sw-tr__hint">{{ locale.t('admin.translationsHint') }}</p>
      </div>
    </header>

    <div class="sw-tr__tabs" role="tablist">
      <button
        v-for="lang in TRANSLATION_LANGS"
        :key="lang"
        type="button"
        role="tab"
        :aria-selected="activeLang === lang"
        class="sw-tr__tab"
        :class="{ 'is-active': activeLang === lang }"
        @click="activeLang = lang"
      >
        <span>{{ langLabel(lang) }}</span>
        <span class="sw-tr__count" :class="{ 'is-full': filledCount(lang) === fields.length }">
          {{ filledCount(lang) }}/{{ fields.length }}
        </span>
      </button>
    </div>

    <div class="sw-tr__panel">
      <label v-for="field in fields" :key="`${activeLang}-${field.key}`" class="sw-tr__field">
        <span>{{ field.label }}</span>
        <textarea
          v-if="field.type === 'textarea'"
          :value="valueOf(activeLang, field.key)"
          :rows="field.rows ?? 3"
          :placeholder="base?.[field.key] || ''"
          @input="setValue(activeLang, field.key, ($event.target as HTMLTextAreaElement).value)"
        />
        <input
          v-else
          type="text"
          :value="valueOf(activeLang, field.key)"
          :placeholder="base?.[field.key] || ''"
          @input="setValue(activeLang, field.key, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.sw-tr {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-lg);
  background: var(--admin-surface-2);
}

.sw-tr__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.sw-tr__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: var(--radius-sm);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.sw-tr__title {
  font-size: 0.82rem;
  font-weight: 620;
  letter-spacing: 0.02em;
}

.sw-tr__hint {
  margin-top: 2px;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--admin-text-muted);
}

.sw-tr__tabs {
  display: flex;
  gap: 6px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--admin-surface-3);
}

.sw-tr__tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 550;
  color: var(--admin-text-muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.sw-tr__tab.is-active {
  background: var(--admin-surface);
  color: var(--admin-text);
  box-shadow: var(--shadow-xs);
}

.sw-tr__count {
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--admin-surface-3);
  font-size: 0.68rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--admin-text-subtle);
}

.sw-tr__tab.is-active .sw-tr__count {
  background: var(--admin-surface-3);
}

.sw-tr__count.is-full {
  background: var(--admin-success-soft);
  color: var(--admin-success);
}

.sw-tr__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-tr__field :deep(input),
.sw-tr__field :deep(textarea) {
  background: var(--admin-surface);
}
</style>
