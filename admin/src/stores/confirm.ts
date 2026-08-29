import { defineStore } from 'pinia';
import { ref } from 'vue';

interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

/**
 * Replaces window.confirm(), which cannot be styled and reads as a browser
 * error to anyone using the panel. `ask()` resolves to the user's answer.
 */
export const useConfirmStore = defineStore('confirm', () => {
  const request = ref<ConfirmRequest | null>(null);
  let resolver: ((ok: boolean) => void) | null = null;

  function ask(next: ConfirmRequest): Promise<boolean> {
    request.value = next;
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
    });
  }

  function answer(ok: boolean) {
    request.value = null;
    resolver?.(ok);
    resolver = null;
  }

  return { request, ask, answer };
});
