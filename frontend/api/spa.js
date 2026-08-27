/**
 * SPA fallback with correct HTTP status codes.
 *
 * Every indexable route is written to disk by `scripts/prerender.mjs` and
 * served straight from Vercel's filesystem, so this function only ever runs
 * for a path that has no prerendered file. That makes it the right place to
 * answer the question the old catch-all rewrite could not: does this URL
 * actually exist?
 *
 *   - a product/brand/collection the API still knows about (added after the
 *     last deploy) → 200 with the SPA shell, so a new listing is reachable
 *     immediately rather than 404ing until the next build;
 *   - anything else → a real 404, with the SPA rendering its Not Found page.
 *
 * Carries no third-party dependency — it is on the critical path for unknown
 * URLs and must not pay a bundle or cold-start penalty it does not need. The
 * one thing it does import is `src/seo/schema.mjs`, the pure module the app
 * and the prerenderer already share, so the head it injects for a
 * not-yet-prerendered product is built by exactly the same code as the head
 * the next build will write to disk.
 */

import {
  brandNameOf,
  createSite,
  headTags,
  pageTitle,
  resolveSiteUrl,
} from '../src/seo/schema.mjs';

const API = (process.env.SEO_API_URL || 'https://swiss.techinfo.uz').replace(/\/+$/, '');

// Non-strict: this runs per request, and a config slip must not take the site
// down. The build gate (vite.config.ts + prerender.mjs) is what guarantees the
// value is set — this only decides what a warm lambda falls back to.
const site = createSite({
  url: resolveSiteUrl(process.env.VITE_SITE_URL || process.env.SITE_URL),
  name: process.env.VITE_SITE_NAME || process.env.SITE_NAME,
  contactEmail: process.env.VITE_CONTACT_EMAIL,
  contactPhone: process.env.VITE_CONTACT_PHONE,
});
const SITE_NAME = site.name;

/** Prerendered documents, cached for the lifetime of a warm instance. */
const documentCache = new Map();

const MINIMAL_SHELL = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>${SITE_NAME}</title></head><body><div id="app"></div></body></html>`;

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Fetches one of the build's own static documents: `_shell.html` (the bare SPA
 * shell) or `404.html` (the shell already carrying Not Found metadata).
 *
 * `__shell=1` marks the request so that a missing file — which would fall
 * through this same catch-all rewrite — cannot loop back into this function
 * (see the guard in the handler).
 */
async function loadDocument(host, path) {
  if (documentCache.has(path)) return documentCache.get(path);
  try {
    const response = await fetch(`https://${host}${path}?__shell=1`);
    if (response.ok) {
      const html = await response.text();
      if (html.includes('<div id="app">')) {
        documentCache.set(path, html);
        return html;
      }
    }
  } catch {
    /* fall through to the minimal shell */
  }
  return MINIMAL_SHELL;
}

/** The three entity routes whose slugs the API can confirm. */
function entityLookup(pathname) {
  const match = /^\/(products|brands|collections)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const [, section, slug] = match;
  const endpoint = section === 'products' ? 'watches' : section;
  return { endpoint, slug: decodeURIComponent(slug), canonical: `${section}/${slug}` };
}

async function findEntity(lookup) {
  try {
    const response = await fetch(`${API}/api/${lookup.endpoint}/${encodeURIComponent(lookup.slug)}?lang=en`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const record = await response.json();
    return record && record.slug ? record : null;
  } catch {
    // An API outage must not turn a live catalog into 404s: treat the URL as
    // unverifiable and let the caller decide (it serves 200).
    return undefined;
  }
}

/**
 * Enough head for a page the last build did not know about yet.
 *
 * Built through `headTags`, the same function the prerenderer calls, so this
 * stopgap head and the permanent one agree on the title budget, the canonical
 * form and the tag set.
 */
function injectMeta(shell, record, canonicalPath) {
  const headline = [brandNameOf(record), record.name].filter(Boolean).join(' ').trim();
  const tags = headTags(
    {
      title: pageTitle(headline, site),
      description: record.shortDescription || record.description || '',
      canonical: `/${canonicalPath}`,
      type: 'product',
    },
    site,
  );

  const head = [
    `<title>${escapeHtml(tags.title)}</title>`,
    `<link rel="canonical" data-seo href="${escapeHtml(tags.canonical)}" />`,
    ...tags.metas.map((meta) => {
      const attr = meta.property ? 'property' : 'name';
      return `<meta ${attr}="${escapeHtml(meta.property ?? meta.name)}" data-seo content="${escapeHtml(meta.content)}" />`;
    }),
  ].join('\n    ');

  return shell.replace(/<title>[\s\S]*?<\/title>/i, head);
}

export default async function handler(req, res) {
  const host = req.headers.host || process.env.VERCEL_URL || '';
  const pathname = decodeURI((req.url || '/').split('?')[0]);

  // Recursion guard: only reachable when /_shell.html itself is missing.
  if ((req.url || '').includes('__shell=1')) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(MINIMAL_SHELL);
  }

  const lookup = entityLookup(pathname);
  const record = lookup ? await findEntity(lookup) : null;

  // `undefined` means the lookup itself failed — an API outage must not turn a
  // live catalog into 404s, so serve the app and let it retry client-side.
  if (lookup && record === undefined) {
    const shell = await loadDocument(host, '/_shell.html');
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(shell);
  }

  if (record) {
    const shell = await loadDocument(host, '/_shell.html');
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    // Short shared cache: the page exists but has no prerendered copy yet, so
    // the next deploy should be able to replace it quickly.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.end(injectMeta(shell, record, lookup.canonical));
  }

  // Real 404, served with the prerendered Not Found document so the status
  // code, the metadata and what the visitor reads all agree.
  const notFound = await loadDocument(host, '/404.html');
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  return res.end(notFound);
}
