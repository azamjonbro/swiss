import en from './en';
import ru from './ru';
import uz from './uz';

export type Lang = 'uz' | 'ru' | 'en';
export const SUPPORTED_LANGS: Lang[] = ['uz', 'ru', 'en'];
export const LANG_LABELS: Record<Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export const dictionaries = { uz, ru, en };

export type { Dictionary } from './en';
