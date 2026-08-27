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
