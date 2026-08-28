/**
 * Build-time prerenderer.
 *
 * The storefront is a Vue SPA: the shipped `index.html` carries no title, no
 * canonical, no product data — every crawler that does not execute JavaScript
 * (every social preview bot, and Google before its render pass) sees an empty
 * page. Migrating to an SSR framework would mean rewriting the app; this does
 * the smallest reliable thing instead: after `vite build`, it fetches the real
 * catalog from the API and writes one static HTML file per indexable route,
 * each with its own <title>, description, canonical, Open Graph tags, JSON-LD
 * and a crawlable copy of the page's own content.
 *
 * Vercel serves those files straight from the filesystem (see vercel.json), so
 * the crawler gets HTML and the visitor still gets the SPA — Vue clears
 * `#app` and mounts over the prerendered markup on load.
 *
 * Metadata is built by `src/seo/schema.mjs`, the same module the running app
 * uses, so the static HTML and the live DOM cannot disagree.
 *
 * Failure is never fatal: if the API is unreachable the static routes are
 * still written and the build succeeds with a warning, leaving the site
 * exactly as it behaved before.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  absoluteUrl,
  brandPath,
  brandSeo,
  breadcrumbSchema,
  collectionPath,
  collectionSeo,
  formatStoreAddress,
  headTags,
  itemListSchema,
  jsonLdGraph,
  organizationSchema,
  productPath,
  productSchema,
  staticSeo,
  storeSchemas,
  tidyDescription,
  STORES_PATH,
  usableLocations,
  watchFullName,
  watchImageAlt,
  watchImages,
  watchSeo,
  websiteSchema,
} from '../src/seo/schema.mjs';
import { loadEnvFiles, readSiteEnv } from './site-env.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// `vite build` has already exited by the time this runs, so nothing has loaded
// the project's .env files for us. Real environment variables (Vercel) win.
const ENV = { ...loadEnvFiles(ROOT, 'production'), ...process.env };

// `strict`: the prerenderer writes canonical, Open Graph and JSON-LD URLs into
// static HTML that a crawler will read as final. A wrong origin here is not
// recoverable at runtime, so a missing or localhost VITE_SITE_URL fails the
// build rather than guessing.
const { site, apiUrl: API } = readSiteEnv(ENV, { strict: true });

/** Language the crawlable copy is written in. The SPA still localises at runtime. */
const LANG = ENV.SEO_LANG ?? 'en';
const PAGE_SIZE = 60;

/**
 * Physical boutiques, read from the app's own data file. Empty until real
 * addresses exist — and while it is empty `/stores` is not written, not
 * linked, not listed in the sitemap, and emits no LocalBusiness node.
 */
const LOCATIONS = usableLocations(
  JSON.parse(await readFile(join(ROOT, 'src/data/locations.json'), 'utf8').catch(() => '[]')),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON-LD lives in a script element: only `<` needs neutralising. */
const escapeJsonLd = (json) => json.replace(/</g, '\\u003c');

async function api(path) {
  const url = `${API}${path}${path.includes('?') ? '&' : '?'}lang=${LANG}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/** Walks the paginated catalog endpoint to the end. */
async function fetchAllWatches(params = '') {
  const items = [];
  for (let page = 1; page <= 50; page += 1) {
    const data = await api(`/api/watches?limit=${PAGE_SIZE}&page=${page}${params}`);
    items.push(...(data.items ?? []));
    if (!data.pages || page >= data.pages) break;
  }
  return items;
}

// ---------------------------------------------------------------------------
// HTML assembly
// ---------------------------------------------------------------------------

/**
 * The built shell with every head tag this script manages removed, so a page
 * can never inherit another one's description, canonical or structured data.
 *
 * The strip also makes the script idempotent: run against an already
 * prerendered file it recovers the original shell rather than compounding
 * tags. `#app` is emptied for the same reason.
 */
function baseShell(html) {
  return html
    // The shipped index.html is authored in English; the crawlable copy is
    // whatever SEO_LANG says. A document that declares the wrong language is a
    // worse signal than one that declares none.
    .replace(/(<html\b[^>]*\blang=")[^"]*(")/i, `$1${LANG}$2`)
    .replace(/\n?\s*<script type="application\/ld\+json" data-seo-jsonld>[\s\S]*?<\/script>/gi, '')
    .replace(/\n?\s*<(?:meta|link)\b[^>]*\bdata-seo\b[^>]*>/gi, '')
    .replace(/\n?\s*<meta name="description"[^>]*>/gi, '')
    .replace(/\n?\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\n?\s*<meta property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<div id="app">[\s\S]*?<\/div>\s*(?=<script)/i, '<div id="app"></div>\n    ');
}

function renderHead(seo) {
  const tags = headTags({ lang: LANG, ...seo }, site);
  const lines = [
    `<link rel="canonical" data-seo href="${escapeHtml(tags.canonical)}" />`,
    ...tags.metas.map((meta) => {
      const attr = meta.property ? 'property' : 'name';
      const key = meta.property ?? meta.name;
      return `<meta ${attr}="${escapeHtml(key)}" data-seo content="${escapeHtml(meta.content)}" />`;
    }),
  ];
  return { title: tags.title, headHtml: lines.map((line) => `    ${line}`).join('\n') };
}

/**
 * Writes one route. `body` is the crawlable copy of the page: Vue empties
 * `#app` and mounts over it, so a visitor never sees it — a crawler that does
 * not run scripts sees the real headings, copy and links.
 */
async function writePage({ filePath, seo, nodes = [], body = '' }, shell) {
  const { title, headHtml } = renderHead(seo);
  // Organization travels with every graph so `seller`/`publisher` @id
  // references resolve on the page that makes them.
  if (nodes.length && !nodes.some((node) => node['@type'] === 'Organization')) {
    nodes = [organizationSchema(site), ...nodes];
  }
  const jsonLd = nodes.length
    ? `\n    <script type="application/ld+json" data-seo-jsonld>${escapeJsonLd(jsonLdGraph(nodes))}</script>`
    : '';

  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>\n${headHtml}${jsonLd}`)
    .replace('<div id="app"></div>', `<div id="app">${body}</div>`);

  const target = join(DIST, filePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

// ---------------------------------------------------------------------------
// Crawlable page bodies
// ---------------------------------------------------------------------------

const link = (href, text) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

const crumbsHtml = (items) =>
  `<nav aria-label="Breadcrumb"><ol>${items
    .map((item, i) =>
      i === items.length - 1
        ? `<li>${escapeHtml(item.name)}</li>`
        : `<li>${link(item.path, item.name)}</li>`,
    )
    .join('')}</ol></nav>`;

const productListHtml = (watches, heading) =>
  watches.length
    ? `<section><h2>${escapeHtml(heading)}</h2><ul>${watches
        .map((w) => `<li>${link(productPath(w.slug), watchFullName(w) || w.name)}</li>`)
        .join('')}</ul></section>`
    : '';

function productBody(watch) {
  const images = watchImages(watch);
  const brand = typeof watch.brand === 'object' && watch.brand ? watch.brand : null;
  const specs = [
    ['Reference', watch.reference],
    ['Movement', watch.movement],
    ['Case', [watch.caseMaterial, watch.caseSize].filter(Boolean).join(', ')],
    ['Dial', watch.dial],
    ['Bracelet', watch.bracelet],
    ['Water resistance', watch.waterResistance],
  ].filter(([, value]) => value);

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Watches', path: '/watches' },
    ...(brand ? [{ name: brand.name, path: brandPath(brand.slug) }] : []),
    { name: watch.name, path: productPath(watch.slug) },
  ];

  return [
    '<main>',
    crumbsHtml(trail),
    '<article>',
    brand ? `<p>${link(brandPath(brand.slug), brand.name)}</p>` : '',
    // Brand + model, matching the <title>, the Product schema `name` and the
    // <h1> the mounted app renders. The bare model number on its own was not a
    // heading anyone could search for.
    `<h1>${escapeHtml(watchFullName(watch) || watch.name)}</h1>`,
    images[0]
      ? `<img src="${escapeHtml(absoluteUrl(site, images[0]))}" alt="${escapeHtml(watchImageAlt(watch))}" />`
      : '',
    typeof watch.price === 'number' && watch.price > 0
      ? `<p>${escapeHtml(`${watch.price} ${watch.currency ?? 'USD'}`)}</p>`
      : '',
    // The long description often opens with the short one verbatim; printing
    // both would just repeat a sentence to the crawler.
    watch.shortDescription && !String(watch.description ?? '').startsWith(watch.shortDescription)
      ? `<p>${escapeHtml(tidyDescription(watch.shortDescription))}</p>`
      : '',
    watch.description ? `<p>${escapeHtml(tidyDescription(watch.description))}</p>` : '',
    specs.length
      ? `<h2>Specifications</h2><dl>${specs
          .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
          .join('')}</dl>`
      : '',
    '</article>',
    '</main>',
  ].join('');
}

function listingBody({ heading, description, crumbs, items, itemsHeading }) {
  return [
    '<main>',
    crumbs ? crumbsHtml(crumbs) : '',
    `<h1>${escapeHtml(heading)}</h1>`,
    description ? `<p>${escapeHtml(description)}</p>` : '',
    items ? productListHtml(items, itemsHeading) : '',
    '</main>',
  ].join('');
}

/** The boutiques page. Only ever called when at least one boutique exists. */
function storesBody(locations) {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Boutiques', path: STORES_PATH },
  ];
  return [
    '<main>',
    crumbsHtml(trail),
    `<h1>${escapeHtml('Boutiques')}</h1>`,
    `<p>${escapeHtml(staticSeo('stores', site).description)}</p>`,
    '<ul>',
    ...locations.map((loc) =>
      [
        '<li>',
        `<h2>${escapeHtml(loc.name)}</h2>`,
        `<p>${escapeHtml(formatStoreAddress(loc))}</p>`,
        loc.telephone ? `<p>${escapeHtml(loc.telephone)}</p>` : '',
        Array.isArray(loc.openingHours) && loc.openingHours.length
          ? `<p>${escapeHtml(loc.openingHours.join('; '))}</p>`
          : '',
        loc.mapUrl ? `<p>${link(loc.mapUrl, 'Directions')}</p>` : '',
        '</li>',
      ].join(''),
    ),
    '</ul>',
    '</main>',
  ].join('');
}

/** The site's own primary links, with /stores appearing only once it exists. */
const exploreLinks = () => [
  { name: 'Swiss watches catalog', path: '/watches' },
  { name: 'Watch brands', path: '/brands' },
  { name: 'Watch collections', path: '/collections' },
  ...(LOCATIONS.length ? [{ name: 'Boutiques', path: STORES_PATH }] : []),
];

const linkListBody = ({ heading, description, links, linksHeading }) =>
  [
    '<main>',
    `<h1>${escapeHtml(heading)}</h1>`,
    description ? `<p>${escapeHtml(description)}</p>` : '',
    links.length
      ? `<section><h2>${escapeHtml(linksHeading)}</h2><ul>${links
          .map((item) => `<li>${link(item.path, item.name)}</li>`)
          .join('')}</ul></section>`
      : '',
    '</main>',
  ].join('');

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  // `vite build` empties dist, so `_shell.html` only exists when this script
  // is being re-run against an existing build — in which case it, not the
  // already-prerendered index.html, is the honest starting point.
  const source = await readFile(join(DIST, '_shell.html'), 'utf8').catch(() =>
    readFile(join(DIST, 'index.html'), 'utf8'),
  );
  const shell = baseShell(source);
  // Untouched copy, also served to the 404 function for paths with no
  // prerendered file of their own.
  await writeFile(join(DIST, '_shell.html'), shell, 'utf8');

  const written = [];
  const page = async (spec) => {
    await writePage(spec, shell);
    written.push(spec.filePath);
  };

  // -- application surfaces: real metadata, explicitly not indexed -----------
  const appRoutes = [
    ['account', 'account.html'],
    ['account-orders', 'account/orders.html'],
    ['account-saved', 'account/saved.html'],
    ['account-settings', 'account/settings.html'],
    ['account-login', 'account/login.html'],
    ['account-register', 'account/register.html'],
    ['account-forgot-password', 'account/forgot-password.html'],
    ['account-reset-password', 'account/reset-password.html'],
    ['account-verify-email', 'account/verify-email.html'],
    ['not-found', '404.html'],
  ];
  for (const [key, filePath] of appRoutes) {
    await page({ filePath, seo: staticSeo(key, site) });
  }

  let catalog = null;
  try {
    const [watches, accessories, brands, collectionList] = await Promise.all([
      fetchAllWatches(),
      fetchAllWatches('&type=accessory'),
      api('/api/brands').then((d) => d.items ?? []),
      api('/api/collections').then((d) => d.items ?? []),
    ]);
    const collections = await Promise.all(
      collectionList.map((c) => api(`/api/collections/${c.slug}`).catch(() => c)),
    );
    catalog = { watches, accessories, brands, collections };
  } catch (error) {
    console.warn(`[prerender] catalog unavailable (${error.message}) — static routes only.`);
  }

  const allProducts = catalog ? [...catalog.watches, ...catalog.accessories] : [];

  // -- home -----------------------------------------------------------------
  await page({
    filePath: 'index.html',
    seo: staticSeo('home', site),
    nodes: [organizationSchema(site), websiteSchema(site)],
    body: linkListBody({
      heading: staticSeo('home', site).heading,
      description: staticSeo('home', site).description,
      linksHeading: 'Explore',
      links: [
        ...exploreLinks(),
        { name: `About ${site.name}`, path: '/about' },
        { name: 'Contact us', path: '/contact' },
        ...(catalog?.watches ?? [])
          .slice(0, 12)
          .map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
      ],
    }),
  });

  // -- catalog --------------------------------------------------------------
  await page({
    filePath: 'watches.html',
    seo: staticSeo('watches', site),
    nodes: catalog
      ? [
          itemListSchema(
            catalog.watches.map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
            site,
            'Swiss watches',
          ),
          breadcrumbSchema(
            [
              { name: 'Home', path: '/' },
              { name: 'Watches', path: '/watches' },
            ],
            site,
          ),
        ]
      : [],
    body: listingBody({
      heading: staticSeo('watches', site).heading,
      description: staticSeo('watches', site).description,
      crumbs: [
        { name: 'Home', path: '/' },
        { name: 'Watches', path: '/watches' },
      ],
      items: catalog?.watches ?? [],
      itemsHeading: 'Available timepieces',
    }),
  });

  // -- brands ---------------------------------------------------------------
  await page({
    filePath: 'brands.html',
    seo: staticSeo('brands', site),
    nodes: catalog
      ? [itemListSchema(catalog.brands.map((b) => ({ name: b.name, path: brandPath(b.slug) })), site, 'Watch brands')]
      : [],
    body: linkListBody({
      heading: staticSeo('brands', site).heading,
      description: staticSeo('brands', site).description,
      linksHeading: 'Maisons',
      links: (catalog?.brands ?? []).map((b) => ({ name: `${b.name} watches`, path: brandPath(b.slug) })),
    }),
  });

  for (const brand of catalog?.brands ?? []) {
    const brandWatches = allProducts.filter(
      (w) => (typeof w.brand === 'object' ? w.brand?._id : w.brand) === brand._id,
    );
    const trail = [
      { name: 'Home', path: '/' },
      { name: 'Brands', path: '/brands' },
      { name: brand.name, path: brandPath(brand.slug) },
    ];
    await page({
      filePath: `brands/${brand.slug}.html`,
      seo: brandSeo(brand, site),
      nodes: [
        breadcrumbSchema(trail, site),
        itemListSchema(
          brandWatches.map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
          site,
          `${brand.name} watches`,
        ),
      ],
      body: listingBody({
        heading: brand.name,
        description: brand.description,
        crumbs: trail,
        items: brandWatches,
        itemsHeading: `${brand.name} timepieces`,
      }),
    });
  }

  // -- collections ----------------------------------------------------------
  await page({
    filePath: 'collections.html',
    seo: staticSeo('collections', site),
    nodes: catalog
      ? [
          itemListSchema(
            catalog.collections.map((c) => ({ name: c.name, path: collectionPath(c.slug) })),
            site,
            'Watch collections',
          ),
        ]
      : [],
    body: linkListBody({
      heading: staticSeo('collections', site).heading,
      description: staticSeo('collections', site).description,
      linksHeading: 'Collections',
      links: (catalog?.collections ?? []).map((c) => ({ name: c.name, path: collectionPath(c.slug) })),
    }),
  });

  for (const collection of catalog?.collections ?? []) {
    const pieces = (collection.watches ?? []).filter((w) => w && typeof w === 'object' && w.slug);
    const trail = [
      { name: 'Home', path: '/' },
      { name: 'Collections', path: '/collections' },
      { name: collection.name, path: collectionPath(collection.slug) },
    ];
    await page({
      filePath: `collections/${collection.slug}.html`,
      seo: collectionSeo(collection, site),
      nodes: [
        breadcrumbSchema(trail, site),
        itemListSchema(
          pieces.map((w) => ({ name: watchFullName(w) || w.name, path: productPath(w.slug) })),
          site,
          collection.name,
        ),
      ],
      body: listingBody({
        heading: collection.name,
        description: collection.description,
        crumbs: trail,
        items: pieces,
        itemsHeading: `${collection.name} timepieces`,
      }),
    });
  }

  // -- products -------------------------------------------------------------
  for (const watch of allProducts) {
    const brand = typeof watch.brand === 'object' && watch.brand ? watch.brand : null;
    const trail = [
      { name: 'Home', path: '/' },
      { name: 'Watches', path: '/watches' },
      ...(brand ? [{ name: brand.name, path: brandPath(brand.slug) }] : []),
      { name: watch.name, path: productPath(watch.slug) },
    ];
    await page({
      filePath: `products/${watch.slug}.html`,
      seo: { ...watchSeo(watch, site), imageAlt: watchImageAlt(watch) },
      nodes: [productSchema(watch, site), breadcrumbSchema(trail, site)],
      body: productBody(watch),
    });
  }

  // -- editorial ------------------------------------------------------------
  for (const key of ['about', 'contact']) {
    const seo = staticSeo(key, site);
    await page({
      filePath: `${key}.html`,
      seo,
      body: linkListBody({
        heading: seo.heading ?? seo.title.split(' | ')[0],
        description: seo.description,
        linksHeading: 'Explore',
        links: exploreLinks(),
      }),
    });
  }

  // -- boutiques ------------------------------------------------------------
  // Written only when real addresses exist. While `locations.json` is empty
  // there is no /stores document, so the catch-all in `api/spa.js` answers the
  // path with a real 404 — exactly as it does for any other unknown URL.
  if (LOCATIONS.length) {
    await page({
      filePath: 'stores.html',
      seo: staticSeo('stores', site),
      nodes: [
        ...storeSchemas(LOCATIONS, site),
        breadcrumbSchema(
          [
            { name: 'Home', path: '/' },
            { name: 'Boutiques', path: STORES_PATH },
          ],
          site,
        ),
        itemListSchema(
          LOCATIONS.map((loc) => ({ name: loc.name, path: STORES_PATH })),
          site,
          'Boutiques',
        ),
      ],
      body: storesBody(LOCATIONS),
    });
  }

  // -- sitemap: the static pages section -------------------------------------
  // Which fixed routes exist is a fact the frontend build knows and the API
  // does not — /stores appears only once `locations.json` is filled. Vercel
  // serves a file on disk ahead of a rewrite, so this static document takes
  // precedence over the API's copy of the same section; every other section
  // (brands, collections, product chunks) still comes from the API, and the
  // sitemap index that lists them all is unchanged.
  await writeStaticPagesSitemap();

  console.log(
    `[prerender] ${written.length} pages → ${allProducts.length} products, ${catalog?.brands.length ?? 0} brands, ${
      catalog?.collections.length ?? 0
    } collections, ${LOCATIONS.length} boutiques`,
  );
}

/** `/sitemap-pages.xml` — the fixed routes, absolute, on the canonical origin. */
async function writeStaticPagesSitemap() {
  const paths = ['/', '/watches', '/brands', '/collections', ...(LOCATIONS.length ? [STORES_PATH] : []), '/about', '/contact'];
  const body = paths
    .map((path) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(site, path))}</loc>\n  </url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await writeFile(join(DIST, 'sitemap-pages.xml'), xml, 'utf8');
}

main().catch((error) => {
  // A prerender failure must never take the deployment down: the SPA still
  // works, it just loses the crawlable copy until the next build. A
  // misconfigured origin is the exception — shipping the wrong canonical host
  // into the index is not something a later build can undo, so it fails hard.
  if (/^\[seo\]/.test(error.message)) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.warn(`[prerender] skipped: ${error.message}`);
});
