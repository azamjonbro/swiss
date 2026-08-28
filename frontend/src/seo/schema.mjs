/**
 * Shared SEO builders — the single source of truth for titles, descriptions,
 * canonical paths and JSON-LD.
 *
 * Imported by BOTH the running app (`src/utils/seo.ts`, which applies the
 * result to the DOM) and the build-time prerenderer (`scripts/prerender.mjs`,
 * which serialises it into static HTML), so a crawler and a browser can never
 * disagree about a page's metadata. Plain `.mjs` on purpose: Node executes it
 * directly during the build, Vite bundles it for the browser, and
 * `schema.d.mts` types it for the TypeScript side.
 *
 * Everything here is pure — no DOM, no `import.meta.env`, no fetching. The
 * caller passes a `site` object: `{ url, name }`.
 *
 * Nothing is invented. Every field below is emitted only when the real record
 * carries it: no placeholder prices, no ratings, no reviews, no SKUs, no
 * business details the database does not hold.
 */

export const PRODUCT_BASE = '/products';
export const STORES_PATH = '/stores';

/**
 * The brand name, spelled one way, everywhere. It is a proper noun: it is not
 * translated, and it is not abbreviated in a title.
 */
export const SITE_NAME = 'SwissWatch Premium';

/** Canonical production origin. */
export const DEFAULT_SITE_URL = 'https://swisswatchpremium.uz';

/**
 * The one hostname allowed to appear in a canonical, an Open Graph URL, a
 * JSON-LD @id or a sitemap <loc>.
 *
 * Blocking localhost and *.vercel.app (below) only rules out the accidents that
 * look wrong. It does not rule out the accident that looks right: a real,
 * parsable, non-preview origin that simply is not this site. A cross-domain
 * canonical is the one SEO mistake a later build cannot undo — Google honours
 * it and deindexes the host that shipped it — so the production build pins the
 * host rather than trusting whatever the environment happens to hold.
 */
export const PRODUCTION_HOST = 'swisswatchpremium.uz';

/** Google truncates a result title past roughly this width. */
export const TITLE_MAX = 60;

/**
 * Open Graph locale codes for the three languages the storefront speaks.
 *
 * `og:locale` has to describe the language the page is actually written in.
 * Hardcoding one value meant an Uzbek page announced itself as `en_US` to every
 * crawler and social preview that read it.
 */
export const OG_LOCALES = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' };
export const DEFAULT_LANG = 'en';

/** `uz` -> `uz_UZ`. Unknown or missing input falls back to the default language. */
export function ogLocale(lang) {
  const key = String(lang ?? '').toLowerCase().slice(0, 2);
  return OG_LOCALES[key] ?? OG_LOCALES[DEFAULT_LANG];
}

/**
 * Validates a configured origin.
 *
 * A silent fallback to localhost is what produced the first bad sitemap, so
 * `strict` (used by the production build and the prerenderer) throws instead
 * of guessing. The runtime is lenient — it has a correct default and must not
 * take the page down — but the build gate above it guarantees the value is set.
 */
export function resolveSiteUrl(raw, { strict = false, label = 'VITE_SITE_URL' } = {}) {
  const value = String(raw ?? '').trim().replace(/\/+$/, '');
  let problem = '';

  if (!value) problem = 'is not set';
  else if (!/^https?:\/\//i.test(value)) problem = `must be an absolute http(s) URL (got "${value}")`;
  else {
    let host = '';
    try {
      host = new URL(value).hostname;
    } catch {
      problem = `is not a parsable URL (got "${value}")`;
    }
    if (!problem && /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host)) {
      problem = `must not point at localhost (got "${value}")`;
    }
    if (!problem && /\.vercel\.app$/i.test(host)) {
      problem = `must not point at a *.vercel.app preview host (got "${value}")`;
    }
    // Only enforced for builds that write permanent URLs (strict). The lenient
    // runtime path keeps its correct default instead of throwing on a page.
    if (!problem && strict && host.toLowerCase() !== PRODUCTION_HOST) {
      problem = `must be ${DEFAULT_SITE_URL} — the storefront's only canonical host (got "${value}")`;
    }
  }

  if (!problem) return value;
  if (strict) {
    throw new Error(
      `[seo] ${label} ${problem}. Set it to ${DEFAULT_SITE_URL} for Production and Preview ` +
        'before building: canonical, Open Graph and sitemap URLs are all derived from it.',
    );
  }
  return DEFAULT_SITE_URL;
}

/**
 * Builds the `site` record every metadata builder reads, so the running app,
 * the prerenderer and the 404 function cannot disagree about who the site is.
 *
 * `contactEmail` and `contactPhone` are optional on purpose: the business may
 * not have published either yet. Absent means absent — the UI renders nothing
 * in their place and the JSON-LD omits the field, rather than shipping a
 * placeholder that a crawler would read as fact.
 */
export function createSite({ url, name, contactEmail, contactPhone } = {}) {
  const site = {
    url: String(url ?? DEFAULT_SITE_URL).replace(/\/+$/, ''),
    name: String(name || SITE_NAME),
    // JPEG, not WebP: several social crawlers still refuse WebP previews.
    defaultImage: '/images/swisswatch_hero.jpg',
    // Raster, not the favicon SVG: Google's Organization logo has to be a
    // raster image of at least 112x112 to be eligible at all, and an SVG is
    // rejected outright. public/logo.png is the same mark at 512x512.
    logo: '/logo.png',
    locale: 'en_US',
    sameAs: ['https://instagram.com/swisswatch_premium'],
  };
  const email = String(contactEmail ?? '').trim();
  const phone = String(contactPhone ?? '').trim();
  if (email) site.contactEmail = email;
  if (phone) site.contactPhone = phone;
  return site;
}

/** `tel:` href for a display phone number — nothing but digits and a leading +. */
export function telHref(phone) {
  const clean = String(phone ?? '').replace(/[^\d+]/g, '');
  return clean ? `tel:${clean}` : '';
}

export function productPath(slug) {
  return `${PRODUCT_BASE}/${slug}`;
}

export function brandPath(slug) {
  return `/brands/${slug}`;
}

export function collectionPath(slug) {
  return `/collections/${slug}`;
}

/** Absolute URL on the production origin. Already-absolute inputs pass through. */
export function absoluteUrl(site, pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) return pathOrUrl;
  return `${site.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Trims one title segment to `max`, on a word boundary, with an ellipsis.
 * Separate from `clampText`: a title has a much tighter budget than a
 * description and must never lose the brand.
 */
export function clampTitleSegment(text, max) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (max <= 1) return '';
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[\s\-\u2013\u2014,;:.]+$/, '')}\u2026`;
}

/**
 * `<headline> | SwissWatch Premium`, never wider than TITLE_MAX.
 *
 * When a product name overruns, the product segment is the one that gives —
 * the brand segment is what makes the result identifiable in a SERP, so it is
 * never truncated.
 */
export function pageTitle(headline, site) {
  if (!headline) return site.name;
  const suffix = ` | ${site.name}`;
  const segment = clampTitleSegment(headline, TITLE_MAX - suffix.length);
  return segment ? `${segment}${suffix}` : site.name;
}

/**
 * Repairs sentences the catalog's own description generator left holes in.
 *
 * Product copy is assembled from stored fields, and a field that is empty used
 * to be concatenated anyway: a watch with no `dial` value ends up described as
 * "…316L case, and finished with a  dial." The double space is the tell — it is
 * the gap where a value should have been, and it cannot occur in copy anyone
 * wrote by hand.
 *
 * The generator is fixed at the source (backend/src/seed/seed.ts), but records
 * created before that fix still carry the broken sentence, so the text is also
 * repaired on the way out: any comma-delimited clause containing such a gap is
 * dropped whole, rather than shipped to a crawler as evidence of generated
 * filler. Nothing is added — this only removes a clause that says nothing.
 */
export function tidyDescription(text) {
  const raw = String(text ?? '');
  if (!/[ \t]{2,}/.test(raw)) return raw.replace(/\s+/g, ' ').trim();

  const sentences = raw.split(/(?<=\.)\s+/).map((sentence) => {
    // A sentence with no gap is left exactly as written — rebuilding a clean
    // one is how the first attempt at this ended up doubling its full stop.
    if (!/[ \t]{2,}/.test(sentence)) return sentence.trim();

    const clauses = sentence.split(/,\s*/).filter((clause) => !/[ \t]{2,}/.test(clause));
    if (!clauses.length) return '';

    const rebuilt = clauses
      .join(', ')
      // Dropping a clause can leave the conjunction that introduced it dangling.
      .replace(/[\s,;:.]+$/, '')
      .replace(/,?\s*\band$/i, '')
      .replace(/[\s,;:.]+$/, '');

    if (!rebuilt) return '';
    // The dropped clause may have been the one carrying the capital letter.
    return `${rebuilt.charAt(0).toUpperCase()}${rebuilt.slice(1)}.`;
  });

  return sentences.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Trims to a meta-description-sized string on a word boundary. */
export function clampText(text, max = 158) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

export function brandNameOf(watch) {
  const brand = watch?.brand;
  if (!brand) return '';
  return typeof brand === 'string' ? '' : String(brand.name ?? '');
}

export function brandSlugOf(watch) {
  const brand = watch?.brand;
  if (!brand || typeof brand === 'string') return '';
  return String(brand.slug ?? '');
}

/** Every image across every colorway, de-duplicated, first one first. */
export function watchImages(watch) {
  const seen = new Set();
  for (const variant of watch?.variants ?? []) {
    for (const src of variant?.images ?? []) {
      if (src) seen.add(src);
    }
  }
  return [...seen];
}

export function watchFullName(watch) {
  const brand = brandNameOf(watch);
  return [brand, watch?.name].filter(Boolean).join(' ').trim();
}

/**
 * Product alt text: what the photograph actually shows, nothing stuffed in.
 * "Tsar Bomba Elemental-TB8806Q watch" — the brand and reference the catalogue
 * actually holds, and the type word is dropped for accessories, which are not
 * watches. No provenance is asserted here that the record does not carry.
 */
export function watchImageAlt(watch, index = 0) {
  const base = watchFullName(watch) || String(watch?.name ?? '');
  const kind = watch?.type === 'accessory' ? '' : ' watch';
  return index > 0 ? `${base}${kind} — view ${index + 1}` : `${base}${kind}`;
}

/** schema.org ItemAvailability for the four states the catalog actually stores. */
export function availabilityUrl(availability) {
  switch (availability) {
    case 'in-stock':
      return 'https://schema.org/InStock';
    case 'sold':
      return 'https://schema.org/SoldOut';
    case 'reserved':
      // No "Reserved" member exists; the piece cannot be bought, so OutOfStock
      // is the honest mapping.
      return 'https://schema.org/OutOfStock';
    case 'made-to-order':
      return 'https://schema.org/BackOrder';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Per-entity metadata
// ---------------------------------------------------------------------------

/**
 * A product's meta description.
 *
 * The catalog stores a short blurb per product, but some of them are shared
 * boilerplate ("Tsar Bomba accessory.") across a dozen records — identical
 * descriptions are worth nothing in search. So a blurb that is missing or too
 * short to distinguish anything is extended with the facts the record itself
 * holds (model, reference, movement, case), which are unique per product.
 * Nothing here is invented: every clause comes from a stored field.
 */
function watchDescription(watch, site) {
  const source = clampText(tidyDescription(watch?.shortDescription || watch?.description), 200);
  const facts = [
    watch?.reference ? `ref. ${watch.reference}` : '',
    watch?.movement,
    [watch?.caseMaterial, watch?.caseSize].filter(Boolean).join(' '),
  ].filter(Boolean);

  if (source.length >= 80) return clampText(source);

  const name = watchFullName(watch);
  const detail = facts.length ? `${facts.join(', ')}.` : '';
  const lead = source ? `${source} ` : '';
  return clampText(`${lead}${name} — ${detail} Available at ${site.name} in Tashkent, Uzbekistan.`);
}

export function watchSeo(watch, site) {
  const images = watchImages(watch);
  return {
    title: pageTitle(watchFullName(watch), site),
    description: watchDescription(watch, site),
    canonical: productPath(watch.slug),
    image: images[0] ?? '',
    images,
    type: 'product',
    heading: watch.name,
  };
}

export function brandSeo(brand, site) {
  return {
    title: pageTitle(`${brand.name} Watches`, site),
    description:
      clampText(brand.description) ||
      clampText(`${brand.name} watches at ${site.name} — browse the ${brand.name} timepieces we carry in Tashkent, Uzbekistan.`),
    canonical: brandPath(brand.slug),
    image: brand.image || brand.logo || '',
    type: 'website',
    heading: brand.name,
  };
}

export function collectionSeo(collection, site) {
  return {
    title: pageTitle(`${collection.name} Collection`, site),
    description:
      clampText(collection.description) ||
      clampText(`The ${collection.name} collection at ${site.name} — the timepieces selected for this line, in Tashkent, Uzbekistan.`),
    canonical: collectionPath(collection.slug),
    image: collection.image || '',
    type: 'website',
    heading: collection.name,
  };
}

/**
 * Static pages. Keyed by route name so the router, the pages and the
 * prerenderer all read the same record.
 *
 * `robots: 'noindex, follow'` marks the application surfaces — account and
 * authentication screens — which are crawlable but carry nothing to index.
 */
export function staticSeo(key, site) {
  const pages = {
    home: {
      // Every `heading` below is kept identical to the string the mounted app
      // renders as this route's <h1> (src/i18n/en.ts). The prerenderer cannot
      // import the TypeScript dictionaries, so the values are mirrored here —
      // if one changes, change both, or the crawlable copy and the rendered
      // page disagree about what the page is called.
      heading: site.name,
      // `site.name` alone, not `pageTitle(site.name)` — the helper appends the
      // house name as a suffix, which on this one page would say it twice.
      title: site.name,
      description: `Authenticated timepieces in Tashkent, Uzbekistan. Browse automatic and quartz watches from the maisons ${site.name} represents — discover, inquire, acquire.`,
      canonical: '/',
    },
    watches: {
      heading: 'Timepieces',
      title: pageTitle('Watch Catalogue', site),
      description: `Browse every timepiece available at ${site.name} — automatic and quartz watches, filterable by brand, colour, movement and availability, delivered across Uzbekistan.`,
      canonical: '/watches',
    },
    brands: {
      heading: 'Premium Brands',
      title: pageTitle('Watch Brands', site),
      description: `The watch maisons represented at ${site.name} — explore each brand's timepieces available in Tashkent, Uzbekistan.`,
      canonical: '/brands',
    },
    collections: {
      heading: 'Collections',
      title: pageTitle('Watch Collections', site),
      description: `Curated watch collections at ${site.name} — men's and women's lines assembled from the maisons we represent.`,
      canonical: '/collections',
    },
    stores: {
      title: pageTitle('Boutiques', site),
      description: `Visit ${site.name} in person — addresses, opening hours and directions for every boutique we keep in Uzbekistan.`,
      canonical: STORES_PATH,
    },
    about: {
      heading: 'Built on trust.',
      title: pageTitle('About', site),
      description: `${site.name} is a curated showroom for authenticated timepieces in Tashkent — how we source, examine and present every watch we list.`,
      canonical: '/about',
    },
    contact: {
      heading: 'Speak with SwissWatch Premium',
      title: pageTitle('Contact', site),
      description: `Speak with a ${site.name} specialist in Tashkent about acquisitions, consignments and general enquiries.`,
      canonical: '/contact',
    },
    'not-found': {
      title: pageTitle('Page Not Found', site),
      description: 'The page you are looking for no longer exists.',
      canonical: '/404',
      robots: 'noindex, follow',
    },
  };

  const accountPages = {
    account: ['Account', `Your ${site.name} account.`, '/account'],
    'account-orders': ['Orders', `Your ${site.name} acquisition requests.`, '/account/orders'],
    'account-saved': ['Saved', `Timepieces you have saved at ${site.name}.`, '/account/saved'],
    'account-settings': ['Settings', `Your ${site.name} account settings.`, '/account/settings'],
    'account-login': ['Sign In', `Sign in to your ${site.name} account.`, '/account/login'],
    'account-register': ['Create Account', `Create a ${site.name} account.`, '/account/register'],
    'account-forgot-password': ['Forgot Password', `Request a ${site.name} password reset link.`, '/account/forgot-password'],
    'account-reset-password': ['Choose a New Password', `Set a new password for your ${site.name} account.`, '/account/reset-password'],
    'account-verify-email': ['Confirm Email', `Confirm your ${site.name} email address.`, '/account/verify-email'],
  };

  for (const [name, [heading, description, canonical]] of Object.entries(accountPages)) {
    pages[name] = { title: pageTitle(heading, site), description, canonical, robots: 'noindex, follow' };
  }

  return pages[key];
}

// ---------------------------------------------------------------------------
// Head tags
// ---------------------------------------------------------------------------

/**
 * Normalises one page's SEO into the exact tag set both consumers write.
 * `metas` entries carry either `name` or `property`, matching the attribute
 * the tag must use.
 */
export function headTags(seo, site) {
  const canonical = absoluteUrl(site, seo.canonical);
  const image = absoluteUrl(site, seo.image || site.defaultImage || '');
  const robots = seo.robots || 'index, follow';

  // The language the page is actually written in — the prerenderer passes the
  // language it rendered, the app passes the active locale. `og:locale` used to
  // be a constant, which told every crawler that an Uzbek page was en_US.
  const lang = String(seo.lang || site.lang || DEFAULT_LANG).toLowerCase().slice(0, 2);
  const locale = ogLocale(lang);

  const metas = [
    { name: 'description', content: seo.description },
    { name: 'robots', content: robots },
    { property: 'og:type', content: seo.type || 'website' },
    { property: 'og:site_name', content: site.name },
    { property: 'og:title', content: seo.title },
    { property: 'og:description', content: seo.description },
    { property: 'og:url', content: canonical },
    { property: 'og:locale', content: locale },
    // The same URL serves all three languages, so the others are declared as
    // alternates rather than as separate documents. This is a statement about
    // what the page can render, not a claim that three URLs exist.
    ...Object.values(OG_LOCALES)
      .filter((value) => value !== locale)
      .map((value) => ({ property: 'og:locale:alternate', content: value })),
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: seo.title },
    { name: 'twitter:description', content: seo.description },
  ];

  if (image) {
    metas.push({ property: 'og:image', content: image });
    metas.push({ property: 'og:image:alt', content: seo.imageAlt || seo.title });
    metas.push({ name: 'twitter:image', content: image });
  }

  return { title: seo.title, canonical, metas: metas.filter((m) => m.content) };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

export function organizationSchema(site) {
  const org = {
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
  };
  if (site.logo) org.logo = absoluteUrl(site, site.logo);
  // Only profiles that genuinely exist — an invented handle is worse than none.
  if (site.sameAs?.length) org.sameAs = site.sameAs;
  if (site.contactEmail) org.email = site.contactEmail;
  if (site.contactPhone) org.telephone = site.contactPhone;
  // A contactPoint without a number is an empty shell, so it appears only once
  // a real phone number has been configured.
  if (site.contactPhone) {
    org.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: site.contactPhone,
      ...(site.contactEmail ? { email: site.contactEmail } : {}),
    };
  }
  return org;
}

export function websiteSchema(site) {
  return {
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    publisher: { '@id': `${site.url}/#organization` },
  };
}

/** items: [{ name, path }] — ordered, root first, current page last. */
export function breadcrumbSchema(items, site) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.path),
    })),
  };
}

/** items: [{ name, path }] — the products actually rendered on a listing page. */
export function itemListSchema(items, site, name) {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(site, item.path),
    })),
  };
}

/**
 * Product + Offer + Brand from the stored record only.
 *
 * Deliberately absent: aggregateRating and review (the application stores
 * neither), and any condition/GTIN/MPN claim the catalog does not make.
 */
export function productSchema(watch, site) {
  const url = absoluteUrl(site, productPath(watch.slug));
  const images = watchImages(watch).map((src) => absoluteUrl(site, src));
  const brand = brandNameOf(watch);

  const product = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: watchFullName(watch) || watch.name,
    url,
  };

  if (images.length) product.image = images;
  const description = tidyDescription(watch.description || watch.shortDescription);
  if (description) product.description = clampText(description, 500);
  if (brand) product.brand = { '@type': 'Brand', name: brand };
  // The reference is the manufacturer's model number, which is what MPN means;
  // it doubles as the only stock identifier the catalog holds.
  if (watch.reference) {
    product.sku = watch.reference;
    product.mpn = watch.reference;
  }
  if (watch.caseMaterial) product.material = watch.caseMaterial;
  if (watch.color) product.color = watch.color;

  const availability = availabilityUrl(watch.availability);
  if (typeof watch.price === 'number' && watch.price > 0 && watch.currency) {
    product.offers = {
      '@type': 'Offer',
      url,
      price: watch.price,
      priceCurrency: watch.currency,
      ...(availability ? { availability } : {}),
      seller: { '@id': `${site.url}/#organization` },
    };
  }

  return product;
}

// ---------------------------------------------------------------------------
// Physical boutiques
// ---------------------------------------------------------------------------

/**
 * Drops entries that carry nothing worth publishing. A LocalBusiness needs at
 * minimum a name and something a visitor could actually walk to; a half-filled
 * record is a worse signal than no record, so it is skipped rather than padded.
 */
export function usableLocations(locations) {
  return (Array.isArray(locations) ? locations : []).filter(
    (loc) => loc && String(loc.name ?? '').trim() && String(loc.streetAddress ?? '').trim(),
  );
}

/**
 * One `JewelryStore` (a LocalBusiness subtype) per boutique.
 *
 * Every field is copied from `src/data/locations.json` and nothing else: no
 * guessed opening hours, no invented coordinates, no price range. An empty
 * array in, an empty array out — the caller emits no node at all.
 */
export function storeSchemas(locations, site) {
  return usableLocations(locations).map((loc, index) => {
    const address = {
      '@type': 'PostalAddress',
      streetAddress: loc.streetAddress,
    };
    if (loc.addressLocality) address.addressLocality = loc.addressLocality;
    if (loc.addressRegion) address.addressRegion = loc.addressRegion;
    if (loc.postalCode) address.postalCode = loc.postalCode;
    if (loc.addressCountry) address.addressCountry = loc.addressCountry;

    const node = {
      '@type': 'JewelryStore',
      '@id': `${site.url}${STORES_PATH}#store-${index + 1}`,
      name: loc.name,
      url: `${site.url}${STORES_PATH}`,
      address,
      parentOrganization: { '@id': `${site.url}/#organization` },
    };

    if (loc.telephone) node.telephone = loc.telephone;
    if (Array.isArray(loc.openingHours) && loc.openingHours.length) node.openingHours = loc.openingHours;
    if (loc.geo && typeof loc.geo.latitude === 'number' && typeof loc.geo.longitude === 'number') {
      node.geo = { '@type': 'GeoCoordinates', latitude: loc.geo.latitude, longitude: loc.geo.longitude };
    }
    if (loc.mapUrl) node.hasMap = loc.mapUrl;

    return node;
  });
}

/** A boutique's address on one line, for the crawlable copy and the UI. */
export function formatStoreAddress(loc) {
  return [loc?.streetAddress, loc?.addressLocality, loc?.addressRegion, loc?.postalCode]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Wraps one or more nodes in a single @graph document. */
export function jsonLdGraph(nodes) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
}
