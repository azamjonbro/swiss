import type { RangePreset } from '@/types/analytics';

/**
 * Calendar-day helpers for the analytics range picker.
 *
 * Everything here is a plain `YYYY-MM-DD` string. A calendar day has no time
 * and no offset, and the API takes exactly this form, so turning one into a
 * `Date` on the way through would only invite a timezone to shift it.
 */

/** Today as the browser reckons it — `toISOString()` alone would shift by the offset. */
export function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function shiftDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Presets are inclusive of both ends: "7 days" is today plus the six before it. */
export function rangeFor(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const to = today();
  const span = preset === 'today' ? 0 : preset === '7d' ? 6 : preset === '30d' ? 29 : 89;
  return { from: shiftDays(to, -span), to };
}
