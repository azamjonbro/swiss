<script setup lang="ts">
import { ref } from 'vue';
import {
  TRANSLATION_LANGS,
  type Translations,
  type TranslationLang,
  type TranslationField,
} from '@/types/models';

const props = defineProps<{
  fields: TranslationField[];
  /** The English values, shown as placeholders so it is clear what is being translated. */
  base?: Record<string, string | undefined>;
}>();

const model = defineModel<Translations>({ required: true });

const LANG_LABELS: Record<TranslationLang, string> = { ru: 'Русский', uz: "O'zbekcha" };

const activeLang = ref<TranslationLang>('ru');

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
  <fieldset class="sw-translations">
    <legend class="sw-translations__legend">Translations</legend>
    <p class="sw-translations__hint">
      Leave a field empty to fall back to the English text on the storefront.
    </p>

    <div class="sw-translations__tabs" role="tablist">
      <button
        v-for="lang in TRANSLATION_LANGS"
        :key="lang"
        type="button"
        role="tab"
        :aria-selected="activeLang === lang"
        :class="['sw-translations__tab', { 'is-active': activeLang === lang }]"
        @click="activeLang = lang"
      >
        {{ LANG_LABELS[lang] }}
        <span class="sw-translations__count">{{ filledCount(lang) }}/{{ fields.length }}</span>
      </button>
    </div>

    <div class="sw-translations__panel">
      <label v-for="field in fields" :key="field.key">
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
  </fieldset>
</template>

<style scoped>
.sw-translations {
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-translations__legend {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
  padding: 0 6px;
}

.sw-translations__hint {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
}

.sw-translations__tabs {
  display: flex;
  gap: 8px;
}

.sw-translations__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
}

.sw-translations__tab.is-active {
  color: #fff;
  background: var(--admin-accent);
  border-color: var(--admin-accent);
}

.sw-translations__count {
  font-size: 0.7rem;
  opacity: 0.75;
}

.sw-translations__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
