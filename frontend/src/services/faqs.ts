import { api } from './api';

/** One shop question and its answer, already localised by the API. */
export interface Faq {
  _id: string;
  question: string;
  answer: string;
  order?: number;
}

/**
 * The list is identical on every product page and changes about as often as
 * the opening hours do, so it is fetched once per language and shared: walking
 * through twenty watches must not mean twenty identical round trips on a
 * connection where the baseline latency is half a second.
 *
 * The promise itself is cached, so two components mounting in the same tick
 * make one request. A failed request is evicted, so the next page tries again.
 */
const cache = new Map<string, Promise<Faq[]>>();

export function fetchFaqs(lang: string): Promise<Faq[]> {
  const cached = cache.get(lang);
  if (cached) return cached;

  const request = api
    .get<{ items: Faq[] }>('/faqs')
    .then((res) => res.data.items)
    .catch((error) => {
      cache.delete(lang);
      throw error;
    });

  cache.set(lang, request);
  return request;
}
