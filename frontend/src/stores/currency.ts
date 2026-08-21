import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type CurrencyCode = 'USD' | 'EUR' | 'UZS';
const STORAGE_KEY = 'sw-currency';
const SUPPORTED: CurrencyCode[] = ['USD', 'EUR', 'UZS'];

/**
 * Fixed, indicative conversion rates from USD (the currency all prices are
 * stored in). Update these periodically — there is no live FX API involved,
 * which keeps the storefront working even if an external service is down.
 */
export const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  UZS: 12800,
};

const FORMAT_LOCALE: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  UZS: 'uz-UZ',
};

function readStored(): CurrencyCode | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && (SUPPORTED as string[]).includes(stored) ? (stored as CurrencyCode) : null;
}

export const useCurrencyStore = defineStore('currency', () => {
  const code = ref<CurrencyCode>(readStored() ?? 'USD');

  function setCode(next: CurrencyCode) {
    code.value = next;
  }

  watch(
    code,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value);
    },
    { immediate: true },
  );

  /** Converts a USD amount (how watch prices are stored) into the active currency. */
  function convert(amountUsd: number): number {
    return amountUsd * RATES[code.value];
  }

  /** Converts and formats a USD amount using the active currency's conventions. */
  function format(amountUsd: number): string {
    const converted = convert(amountUsd);
    return new Intl.NumberFormat(FORMAT_LOCALE[code.value], {
      style: 'currency',
      currency: code.value,
      maximumFractionDigits: 0,
    }).format(converted);
  }

  return { code, setCode, convert, format, SUPPORTED };
});
