import type { Watch, WatchVariant } from '@/types/models';

/** The color selector's default variant — first in the array, i.e. seed order. */
export function primaryVariant(watch: Pick<Watch, 'variants'> | undefined | null): WatchVariant | undefined {
  return watch?.variants?.[0];
}

export function primaryImage(watch: Pick<Watch, 'variants'> | undefined | null): string | undefined {
  return primaryVariant(watch)?.images?.[0];
}

export function secondaryImage(watch: Pick<Watch, 'variants'> | undefined | null): string | undefined {
  return primaryVariant(watch)?.images?.[1];
}

// Cosmetic swatch dots only — not product data. Matches the first keyword a
// color slug contains; unrecognized slugs fall back to a neutral dot rather
// than guessing a color that was never in the source photography. Must be
// keyed off the (always-English) colorSlug, never the localized colorLabel —
// the keywords below won't match RU/UZ text and everything would fall back
// to the same neutral dot in those locales.
const COLOR_SWATCHES: [RegExp, string][] = [
  [/black/i, '#1a1a1a'],
  [/white/i, '#f2efe8'],
  [/silver/i, '#c7c9cc'],
  [/gold/i, '#b89652'],
  [/titanium/i, '#8b8d92'],
  [/carbon/i, '#232323'],
  [/blue/i, '#2f4a6b'],
  [/red/i, '#8c2b2b'],
  [/orange/i, '#c1622a'],
  [/grey|gray/i, '#87888c'],
  [/clear|crystal|sapphire/i, '#dfe7e6'],
];

export function colorSwatchHex(colorSlug: string | undefined): string {
  if (!colorSlug) return '#9a958a';
  const match = COLOR_SWATCHES.find(([re]) => re.test(colorSlug));
  return match ? match[1] : '#9a958a';
}

/** Collapses a free-text movement spec ("Automatic, Calibre 3235") to its family, for card/filter labels. */
export function movementType(movement: string | undefined): string {
  if (!movement) return '';
  if (/quartz/i.test(movement)) return 'Quartz';
  if (/manual/i.test(movement)) return 'Manual Winding';
  if (/automatic/i.test(movement)) return 'Automatic';
  return movement;
}

export function toBrandName(brand: unknown): string {
  if (!brand) return '';
  if (typeof brand === 'string') return brand;
  if (typeof brand === 'object' && 'name' in brand) return String((brand as { name: string }).name);
  return '';
}

export function toBrandSlug(brand: unknown): string {
  if (!brand) return '';
  if (typeof brand === 'object' && 'slug' in brand) return String((brand as { slug: string }).slug);
  return '';
}

// Intl's uz-UZ month names render as "M08", so Uzbek dates are composed from an
// explicit month list; RU and EN use Intl directly.
const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const DATE_LOCALES: Record<string, string> = { ru: 'ru-RU', en: 'en-GB' };

/** Long-form date for account records — "25 avgust 2026" and its RU/EN equivalents. */
export function formatDate(value: string | Date | undefined, lang = 'en'): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  if (lang === 'uz') {
    return `${date.getDate()} ${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[lang] ?? 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Presents a stored "+998901234567" as "+998 90 123 45 67". Numbers outside the
 * Uzbek plan are shown as stored rather than grouped by a guess.
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const match = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return match ? `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone;
}
