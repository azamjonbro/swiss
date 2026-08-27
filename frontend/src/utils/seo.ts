/**
 * Applies the shared SEO builders (`@/seo/schema.mjs`) to the live document.
 *
 * Every tag this module writes is marked `data-seo`, so a route change can
 * remove the previous page's tags instead of leaving a stale og:image or a
 * second description behind. The prerendered HTML marks its tags the same way
 * — the app adopts them rather than duplicating them.
 */
import {
  headTags,
  jsonLdGraph,
  organizationSchema,
  websiteSchema,
  type JsonLdNode,
  type PageSeo,
  type SeoSite,
} from '@/seo/schema.mjs';

/**
 * The canonical origin. Set `VITE_SITE_URL` per environment; the default is
 * the production domain so a preview build can never emit localhost URLs into
 * canonical/OG tags.
 */
export const site: SeoSite = {
  url: String(import.meta.env.VITE_SITE_URL ?? 'https://swisspremium.uz').replace(/\/+$/, ''),
  name: String(import.meta.env.VITE_SITE_NAME ?? 'Swiss Premium'),
  // JPEG, not WebP: several social crawlers still refuse WebP previews.
  defaultImage: '/images/swisswatch_hero.jpg',
  logo: '/favicon.svg',
  locale: 'en_US',
  sameAs: ['https://instagram.com/swisswatch_premium'],
};

const MANAGED = 'data-seo';
const JSONLD_ID = 'data-seo-jsonld';

function upsertMeta(key: string, attr: 'name' | 'property', content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(MANAGED, '');
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute(MANAGED, '');
  el.setAttribute('href', href);
}

/** Applies one page's metadata, clearing whatever the previous page left. */
export function applySeo(seo: PageSeo) {
  const tags = headTags(seo, site);

  document.title = tags.title;
  setCanonical(tags.canonical);

  const written = new Set<string>();
  for (const meta of tags.metas) {
    const attr = meta.property ? 'property' : 'name';
    const key = meta.property ?? meta.name ?? '';
    if (!key) continue;
    upsertMeta(key, attr, meta.content);
    written.add(`${attr}:${key}`);
  }

  // Drop managed tags this page does not use (a product's og:image must not
  // survive onto the contact page).
  for (const el of document.head.querySelectorAll<HTMLMetaElement>(`meta[${MANAGED}]`)) {
    const attr = el.hasAttribute('property') ? 'property' : 'name';
    const key = el.getAttribute(attr) ?? '';
    if (!written.has(`${attr}:${key}`)) el.remove();
  }
}

/** Replaces the page's JSON-LD with a single @graph document. */
export function applyJsonLd(nodes: (JsonLdNode | null | undefined)[]) {
  const usable = nodes.filter(Boolean) as JsonLdNode[];
  let el = document.head.querySelector<HTMLScriptElement>(`script[${JSONLD_ID}]`);

  if (!usable.length) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(JSONLD_ID, '');
    document.head.appendChild(el);
  }
  el.textContent = jsonLdGraph(usable);
}

/** Site-level identity, emitted on the homepage. */
export function siteJsonLd(): JsonLdNode[] {
  return [organizationSchema(site), websiteSchema(site)];
}

export type { PageSeo, JsonLdNode };
