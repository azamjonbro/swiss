import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;

/**
 * Transient confirmations. Saving used to be silent — the modal closed and
 * nothing told you whether the write landed.
 */
export const useToastStore = defineStore('toast', () => {
  const items = ref<Toast[]>([]);

  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id);
  }

  function push(message: string, kind: ToastKind = 'success', ttl = 3200) {
    const id = nextId++;
    items.value = [...items.value, { id, kind, message }];
    window.setTimeout(() => dismiss(id), ttl);
  }

  const success = (message: string) => push(message, 'success');
  const error = (message: string) => push(message, 'error', 5000);
  const info = (message: string) => push(message, 'info');

  return { items, push, success, error, info, dismiss };
});
