import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { Brand } from '../models/Brand';
import { Collection } from '../models/Collection';
import { env } from '../config/env';

/**
 * Sitemaps for the storefront.
 *
 * `/sitemap.xml` is an index rather than a flat list, so the catalog can grow
 * past a single file without the URL in Search Console ever changing: sections
 * are separate documents and products are chunked. Only canonical, indexable
 * URLs appear — never account pages, never filter/sort variants, never a
 * product the admin has deactivated.
 */

/** Well under the 50,000-URL / 50 MB limit, and small enough to fetch quickly. */
const CHUNK_SIZE = 5000;

/**
 * The fixed routes, as a fallback.
 *
 * Which fixed routes exist is a fact the storefront build knows and this API
 * does not: `/stores` appears only once `frontend/src/data/locations.json`
 * holds a real address. So the frontend build writes its own
 * `dist/sitemap-pages.xml`, and Vercel serves that file ahead of the rewrite
 * that would otherwise land here — the same precedence that lets a prerendered
 * product page beat the SPA catch-all. This list therefore only answers a
 * request made directly against the API origin; every other section (brands,
 * collections, product chunks) and the index itself are still served from here.
 */
const STATIC_PATHS = ['/', '/watches', '/brands', '/collections', '/about', '/contact'];

interface SitemapEntry {
  path: string;
  lastmod?: Date | string | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function urlset(entries: SitemapEntry[]): string {
  const body = entries
    .map(({ path, lastmod }) => {
      const iso = toIsoDate(lastmod);
      const loc = `    <loc>${escapeXml(`${env.siteUrl}${path}`)}</loc>`;
      return `  <url>\n${loc}${iso ? `\n    <lastmod>${iso}</lastmod>` : ''}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function sitemapIndex(files: string[]): string {
  const body = files
    .map((file) => `  <sitemap>\n    <loc>${escapeXml(`${env.siteUrl}/${file}`)}</loc>\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

function sendXml(res: Response, xml: string) {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
}

/** `/sitemap.xml` — the index every other document hangs off. */
export async function getSitemapIndex(_req: Request, res: Response) {
  const productCount = await Watch.countDocuments({ isActive: true });
  const chunks = Math.max(1, Math.ceil(productCount / CHUNK_SIZE));

  const files = ['sitemap-pages.xml', 'sitemap-brands.xml', 'sitemap-collections.xml'];
  for (let i = 1; i <= chunks; i += 1) files.push(`sitemap-products-${i}.xml`);

  sendXml(res, sitemapIndex(files));
}

/** `/sitemap-<section>.xml` — pages, brands, collections, or a product chunk. */
export async function getSitemapSection(req: Request, res: Response) {
  const section = String(req.params.section ?? '').replace(/\.xml$/i, '');

  if (section === 'pages') {
    sendXml(res, urlset(STATIC_PATHS.map((path) => ({ path }))));
    return;
  }

  if (section === 'brands') {
    const brands = await Brand.find({ isActive: true }).select('slug updatedAt').lean();
    sendXml(res, urlset(brands.map((b) => ({ path: `/brands/${b.slug}`, lastmod: b.updatedAt }))));
    return;
  }

  if (section === 'collections') {
    const collections = await Collection.find({ isActive: true }).select('slug updatedAt').lean();
    sendXml(res, urlset(collections.map((c) => ({ path: `/collections/${c.slug}`, lastmod: c.updatedAt }))));
    return;
  }

  const productChunk = /^products-(\d+)$/.exec(section);
  if (productChunk) {
    const page = Math.max(1, Number(productChunk[1]));
    const watches = await Watch.find({ isActive: true })
      .select('slug updatedAt')
      .sort({ _id: 1 })
      .skip((page - 1) * CHUNK_SIZE)
      .limit(CHUNK_SIZE)
      .lean();
    // Products live at /products/:slug — /watches/:slug is a 301 to it and
    // must never appear in a sitemap.
    sendXml(res, urlset(watches.map((w) => ({ path: `/products/${w.slug}`, lastmod: w.updatedAt }))));
    return;
  }

  res.status(404).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<error>Unknown sitemap</error>');
}
