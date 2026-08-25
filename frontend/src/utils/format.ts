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
