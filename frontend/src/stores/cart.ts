import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { trackGoal } from '@/utils/analytics';

export interface CartItem {
  key: string;
  watchId: string;
  slug: string;
  name: string;
  brandName: string;
  image?: string;
  price: number;
  colorLabel?: string;
  quantity: number;
  isAccessory: boolean;
}

const STORAGE_KEY = 'sw-cart-v1';

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// There is no payment gateway behind this storefront — the cart exists so a
// visitor can assemble a real order (watch + accessories, quantities) before
// it is submitted as a concierge inquiry (see buildInquiryMessage), rather
// than pretending to process a payment that never happens.
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(load());

  watch(
    items,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage can be unavailable (private mode, quota) — the cart still
        // works for the session, it just won't survive a reload.
      }
    },
    { deep: true },
  );

  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.quantity * item.price, 0));

  function add(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    const existing = items.value.find((i) => i.key === item.key);
    if (existing) existing.quantity += quantity;
    else items.value.push({ ...item, quantity });
    trackGoal('add_to_cart', item.slug);
  }

  function remove(key: string) {
    const removed = items.value.find((i) => i.key === key);
    items.value = items.value.filter((i) => i.key !== key);
    if (removed) trackGoal('remove_from_cart', removed.slug);
  }

  function setQuantity(key: string, quantity: number) {
    if (quantity <= 0) return remove(key);
    const item = items.value.find((i) => i.key === key);
    if (item) item.quantity = quantity;
  }

  function clear() {
    items.value = [];
  }

  function buildInquiryMessage(): string {
    const lines = items.value.map((item) => {
      const color = item.colorLabel ? ` (${item.colorLabel})` : '';
      return `${item.name}${color} × ${item.quantity} — $${(item.price * item.quantity).toFixed(2)}`;
    });
    return `Order request:\n${lines.join('\n')}\nSubtotal: $${subtotal.value.toFixed(2)}`;
  }

  return { items, count, subtotal, add, remove, setQuantity, clear, buildInquiryMessage };
});
