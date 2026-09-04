/**
 * The name to *show* for a brand, category or product in the chosen language.
 *
 * Display only. The admin's list and filter labels should follow the language
 * the panel is set to, but the edit forms must keep showing the base `name` —
 * that is the field being edited, and handing a form its own translation would
 * overwrite the original the next time it is saved. So the translation is
 * applied here, in the view, rather than by the API.
 *
 * Falls back to the base name whenever a translation is missing, which is the
 * common case for records created before translations existed.
 */
export function localizedName(record: unknown, lang: string): string {
  if (!record || typeof record !== 'object') return '';
  const doc = record as { name?: unknown; translations?: Record<string, { name?: unknown } | undefined> };
  const translated = lang === 'en' ? undefined : doc.translations?.[lang]?.name;
  const value = translated ?? doc.name;
  return typeof value === 'string' ? value : '';
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
