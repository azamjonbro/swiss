/**
 * The three dictionaries, loaded one at a time.
 *
 * Shipping all three in the entry chunk cost ~122 KB of parsed JavaScript
 * before first paint, of which two thirds was copy in a language the visitor
 * had not asked for. Each is a dynamic import instead, so first paint pays for
 * the active locale only; the other two are fetched when the browser is idle
 * (or the moment the language switcher is hovered), which keeps switching
 * instant without putting the cost on the critical path.
 */
export type Lang = 'uz' | 'ru' | 'en';
export const SUPPORTED_LANGS: Lang[] = ['uz', 'ru', 'en'];
export const LANG_LABELS: Record<Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export type { Dictionary } from './en';
import type { Dictionary } from './en';

const loaders: Record<Lang, () => Promise<{ default: Dictionary }>> = {
  uz: () => import('./uz'),
  ru: () => import('./ru'),
  en: () => import('./en'),
};

const loaded = new Map<Lang, Dictionary>();
const inFlight = new Map<Lang, Promise<Dictionary>>();

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as string[]).includes(value);
}

/** The dictionary, if it is already in memory. Never triggers a fetch. */
export function loadedDictionary(lang: Lang): Dictionary | undefined {
  return loaded.get(lang);
}

export function loadDictionary(lang: Lang): Promise<Dictionary> {
  const cached = loaded.get(lang);
  if (cached) return Promise.resolve(cached);

  let pending = inFlight.get(lang);
  if (!pending) {
    pending = loaders[lang]()
      .then((module) => {
        loaded.set(lang, module.default);
        return module.default;
      })
      .finally(() => inFlight.delete(lang));
    inFlight.set(lang, pending);
  }
  return pending;
}

/**
 * Warms the remaining dictionaries once the browser has nothing better to do,
 * so a language switch never waits on a network round trip.
 */
export function prefetchDictionaries(except: Lang) {
  const rest = SUPPORTED_LANGS.filter((lang) => lang !== except && !loaded.has(lang));
  if (!rest.length) return;

  const run = () => rest.forEach((lang) => void loadDictionary(lang).catch(() => undefined));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
