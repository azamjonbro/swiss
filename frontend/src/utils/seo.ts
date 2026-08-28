/**
 * Applies the shared SEO builders (`@/seo/schema.mjs`) to the live document.
 *
 * Every tag this module writes is marked `data-seo`, so a route change can
 * remove the previous page's tags instead of leaving a stale og:image or a
 * second description behind. The prerendered HTML marks its tags the same way
 * — the app adopts them rather than duplicating them.
 */
import {
  createSite,
  headTags,
  jsonLdGraph,
  organizationSchema,
  resolveSiteUrl,
  storeSchemas,
  websiteSchema,
  type JsonLdNode,
  type PageSeo,
  type SeoSite,
} from '@/seo/schema.mjs';
import { storeLocations } from '@/data/locations';

/**
 * Who this site is, as one record shared with the prerenderer and the 404
 * function (both call the same `createSite`).
 *
 * `VITE_SITE_URL` is validated at build time by the `site-env` plugin in
 * `vite.config.ts`, which fails a production build outright when it is missing
 * or points at localhost — so by the time this runs the value is known good.
 * The lenient fallback here only ever covers `vite dev`.
 *
 * `VITE_CONTACT_EMAIL` / `VITE_CONTACT_PHONE` may legitimately be empty: the
 * business has not published either yet. `createSite` drops empty values, the
 * UI renders nothing in their place, and the JSON-LD omits the field.
 */
export const site: SeoSite = createSite({
  url: resolveSiteUrl(import.meta.env.VITE_SITE_URL),
  name: import.meta.env.VITE_SITE_NAME,
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL,
  contactPhone: import.meta.env.VITE_CONTACT_PHONE,
});

/**
 * The language every subsequent `applySeo` describes the page as.
 *
 * `site` is a module-level constant but the active locale is not, so the store
 * publishes it here rather than every caller having to thread it through. Kept
 * in sync by the locale store; read by `applySeo` below.
 */
export function setSeoLang(lang: string) {
  site.lang = lang;
}

const MANAGED = 'data-seo';
const JSONLD_ID = 'data-seo-jsonld';

/**
 * Reconciles every `<meta>` sharing one key against the values this page wants.
 *
 * Most keys appear once, but `og:locale:alternate` is legitimately repeated, so
 * a plain "find one and overwrite it" would silently keep only the first. This
 * matches existing elements to values by position, creating or removing the
 * difference — which also means the tags the prerendered HTML already carries
 * are adopted rather than duplicated.
 */
function syncMeta(key: string, attr: 'name' | 'property', contents: string[]) {
  const existing = [...document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`)];

  contents.forEach((content, i) => {
    let el = existing[i];
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute(MANAGED, '');
    el.setAttribute('content', content);
  });

  // A page with fewer values than the last one leaves stale tags behind.
  for (const el of existing.slice(contents.length)) el.remove();
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

  // Grouped first: a repeated key (og:locale:alternate) has to be reconciled as
  // a set, not one tag at a time.
  const grouped = new Map<string, { attr: 'name' | 'property'; key: string; contents: string[] }>();
  for (const meta of tags.metas) {
    const attr: 'name' | 'property' = meta.property ? 'property' : 'name';
    const key = meta.property ?? meta.name ?? '';
    if (!key) continue;
    const id = `${attr}:${key}`;
    const entry = grouped.get(id) ?? { attr, key, contents: [] };
    entry.contents.push(meta.content);
    grouped.set(id, entry);
  }

  const written = new Set<string>(grouped.keys());
  for (const { attr, key, contents } of grouped.values()) syncMeta(key, attr, contents);

  // Drop managed tags this page does not use (a product's og:image must not
  // survive onto the contact page).
  for (const el of document.head.querySelectorAll<HTMLMetaElement>(`meta[${MANAGED}]`)) {
    const attr = el.hasAttribute('property') ? 'property' : 'name';
    const key = el.getAttribute(attr) ?? '';
    if (!written.has(`${attr}:${key}`)) el.remove();
  }
}

/**
 * Replaces the page's JSON-LD with a single @graph document. The Organization
 * node is added to every graph: Product's `seller` and WebSite's `publisher`
 * reference it by @id, and a dangling reference is worth nothing.
 */
export function applyJsonLd(nodes: (JsonLdNode | null | undefined)[]) {
  const usable = nodes.filter(Boolean) as JsonLdNode[];
  if (usable.length && !usable.some((node) => node['@type'] === 'Organization')) {
    usable.unshift(organizationSchema(site));
  }
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

/**
 * The boutiques, as JewelryStore nodes. Empty while `locations.json` is empty —
 * `applyJsonLd` then writes nothing at all rather than an empty node.
 */
export function storesJsonLd(): JsonLdNode[] {
  return storeSchemas(storeLocations, site);
}

export type { PageSeo, JsonLdNode };
