import { Brand } from '../models/Brand';
import { Collection } from '../models/Collection';

/**
 * Free-text search over the catalogue.
 *
 * This replaced a MongoDB `$text` index, which could not serve a
 * search-as-you-type overlay: `$text` matches whole stemmed words, so a
 * visitor typing "e", "el", "ele" saw "no results" until they completed
 * "elemental", and "tsar" never matched anything because the brand lives on a
 * ref rather than on the document. Substring regexes have neither problem.
 *
 * The trade-off is that an unanchored regex cannot use an index, so this is a
 * collection scan. The catalogue is under a hundred products and capped at 150
 * per page, so the scan is far cheaper than the round trip that carries it. If
 * the catalogue ever reaches thousands of products, move to Atlas Search
 * rather than reinstating `$text` — the prefix problem would come straight
 * back with it.
 */

/** Fields on Watch worth matching, including both translation bundles. */
const WATCH_FIELDS = [
  'name',
  'reference',
  'shortDescription',
  'description',
  'variants.colorLabel',
  'variants.colorLabelRu',
  'variants.colorLabelUz',
  'movement',
  'caseMaterial',
  'translations.ru.name',
  'translations.ru.shortDescription',
  'translations.ru.description',
  'translations.uz.name',
  'translations.uz.shortDescription',
  'translations.uz.description',
];

const BRAND_FIELDS = ['name', 'translations.ru.name', 'translations.uz.name'];
const COLLECTION_FIELDS = ['name', 'translations.ru.name', 'translations.uz.name'];

/** User input reaches a RegExp verbatim, so every metacharacter is neutered. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Russian keyboards produce "е" where the catalogue stores "ё" — nobody types
 * "чёрный", they type "черный" — so the two are matched interchangeably.
 */
function foldYo(escaped: string): string {
  return escaped.replace(/[еёЕЁ]/g, '[еёЕЁ]');
}

/**
 * Russian and Uzbek inflect: the catalogue holds "Чёрный" while a visitor
 * searches "черные", and "soat" appears as "soatlar". Matching the token's
 * stem as well as the token itself recovers those without a morphology
 * library. Only the token's own tail is dropped — the stem still has to appear
 * at the start of a word — and only for tokens long enough that two fewer
 * characters stay specific, so "red" and "gold" are never widened.
 */
const STEM_MIN_LENGTH = 5;
const STEM_TRIM = 2;

function tokenPattern(token: string): string {
  const full = foldYo(escapeRegex(token));
  // Stemming is a linguistic operation and a model number is not a word:
  // trimming "TB8806Q" to "TB8806" turns a lookup for one specific reference
  // into every colourway that shares its stem. Anything carrying a digit is
  // matched exactly (still as a substring, so a partial reference works).
  if (token.length < STEM_MIN_LENGTH || /\d/.test(token)) return full;
  const stem = foldYo(escapeRegex(token.slice(0, token.length - STEM_TRIM)));
  return `(?:${full}|${stem})`;
}

/**
 * Splits on whitespace so word order stops mattering: "bomba tsar" and
 * "tsar elemental" both work, where one regex over the raw string would only
 * match a literal run of characters. Capped so a pasted paragraph cannot turn
 * into a hundred-clause query.
 */
function tokenize(term: string): string[] {
  return term.trim().split(/\s+/).filter(Boolean).slice(0, 6);
}

function orOn(fields: string[], rx: RegExp) {
  return fields.map((field) => ({ [field]: rx }));
}

/**
 * Builds the `$and` of per-token `$or` clauses that a search term implies, or
 * null when the term is empty. Every token must match somewhere on the
 * document — narrowing as the visitor types, rather than widening.
 */
export async function buildSearchFilter(term: string): Promise<Record<string, unknown> | null> {
  const tokens = tokenize(term);
  if (!tokens.length) return null;

  const clauses = await Promise.all(
    tokens.map(async (token) => {
      const rx = new RegExp(tokenPattern(token), 'i');

      // Brand and collection are refs, so their names are not on the watch
      // document — resolve them to ids and match on those instead.
      const [brandIds, collectionIds] = await Promise.all([
        Brand.find({ $or: orOn(BRAND_FIELDS, rx) }).distinct('_id'),
        Collection.find({ $or: orOn(COLLECTION_FIELDS, rx) }).distinct('_id'),
      ]);

      const or: Record<string, unknown>[] = orOn(WATCH_FIELDS, rx);
      if (brandIds.length) or.push({ brand: { $in: brandIds } });
      if (collectionIds.length) or.push({ collectionRef: { $in: collectionIds } });

      return { $or: or };
    }),
  );

  return { $and: clauses };
}
