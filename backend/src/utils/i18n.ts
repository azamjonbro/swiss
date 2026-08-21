import { Request } from 'express';

export type Lang = 'en' | 'ru' | 'uz';
export const LANGS: Lang[] = ['en', 'ru', 'uz'];

export function resolveLang(req: Request): Lang {
  const q = req.query.lang;
  return LANGS.includes(q as Lang) ? (q as Lang) : 'en';
}

type Translations = Partial<Record<Lang, Record<string, string>>>;

function toPlain(doc: unknown): Record<string, unknown> {
  return doc && typeof (doc as { toObject?: unknown }).toObject === 'function'
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : (doc as Record<string, unknown>);
}

/**
 * Overlays translated field values onto a plain copy of the document.
 * Base (English) fields act as the fallback when a translation is missing,
 * so documents created before translations existed keep rendering correctly.
 */
export function localize<T>(input: T, lang: Lang, fields: string[]): T {
  const doc = toPlain(input);
  if (!doc) return doc as T;

  const translations = doc.translations as Translations | undefined;
  const t = lang !== 'en' ? translations?.[lang] : undefined;

  const out: Record<string, unknown> = { ...doc };
  delete out.translations;
  if (t) {
    for (const field of fields) {
      if (t[field]) out[field] = t[field];
    }
  }
  return out as T;
}

export function localizeList<T>(items: T[], lang: Lang, fields: string[]): T[] {
  return items.map((item) => localize(item, lang, fields));
}
