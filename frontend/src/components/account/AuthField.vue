<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useLocaleStore } from '@/stores/locale';

interface Props {
  modelValue: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  autocomplete?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  inputmode?: 'text' | 'email' | 'tel' | 'numeric';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  autocomplete: undefined,
  required: false,
  invalid: false,
  hint: undefined,
  inputmode: undefined,
});

const emit = defineEmits<{ 'update:modelValue': [string] }>();

const locale = useLocaleStore();
const fieldId = useId();
const isRevealed = ref(false);

const isPassword = computed(() => props.type === 'password');
const resolvedType = computed(() => (isPassword.value && isRevealed.value ? 'text' : props.type));

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="sw-field" :class="{ 'sw-field--invalid': invalid, 'sw-field--with-toggle': isPassword }">
    <div class="sw-field__control">
      <!-- The blank placeholder is what drives the floating label via
           :placeholder-shown; it is never visible. -->
      <input
        :id="fieldId"
        class="sw-field__input"
        :type="resolvedType"
        :value="modelValue"
        :autocomplete="autocomplete"
        :required="required"
        :inputmode="inputmode"
        :aria-invalid="invalid || undefined"
        placeholder=" "
        @input="onInput"
      />
      <label class="sw-field__label" :for="fieldId">{{ label }}</label>
      <span class="sw-field__rule" aria-hidden="true" />
      <button
        v-if="isPassword"
        class="sw-field__toggle"
        type="button"
        :aria-label="isRevealed ? locale.t('account.hidePassword') : locale.t('account.showPassword')"
        @click="isRevealed = !isRevealed"
      >
        {{ isRevealed ? locale.t('account.hidePassword') : locale.t('account.showPassword') }}
      </button>
    </div>
    <p v-if="hint" class="sw-field__hint">{{ hint }}</p>
  </div>
</template>
