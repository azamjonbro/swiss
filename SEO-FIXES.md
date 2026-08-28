# SEO Fixes — implementation report

**Date:** 2026-08-28
**Primary domain (confirmed):** `https://swisswatchpremium.uz`
**Architecture:** Ahost → DNS → Vercel → `frontend/dist` → `https://swisswatchpremium.uz`
**No domain migration.** `swisspremium.uz` is not used anywhere and never was.

Companion to [`SEO-AUDIT.md`](SEO-AUDIT.md), whose §13/§14/§17 were written on a wrong
domain premise and are void. Where the two disagree, this file is newer.

---

## 0. The correction that removes the biggest "finding"

The audit's largest P0 — *"every canonical, og:url, JSON-LD @id and sitemap loc points at
the wrong domain"* — **was wrong.** `swisswatchpremium.uz` is the correct canonical host,
and the code already used it everywhere.

Verified across the whole repository:

| Search | Result |
|---|---|
| `swisspremium.uz` | **0 occurrences** anywhere in the repo |
| `swisswatchpremium.uz` | Canonical host in `schema.mjs`, `.env`, `index.html`, `robots.txt`, backend `SITE_URL` |
| `localhost` | Only dev proxies (`vite.config.ts`), the log line in `server.ts`, dev defaults, and the guard code that *rejects* it |
| `vercel.app` | Only the guard code that *rejects* it |
| `swiss.techinfo.uz` | Only as the API/media origin — intentional, left in place |
| Built output (120 HTML files + sitemap + robots) | **120/120 canonicals on `https://swisswatchpremium.uz`**, zero leakage |

The API origin and the canonical storefront origin are correctly kept as separate concepts.

---

## A. Fixed

### A1 — Canonical host is now pinned, not merely validated
`frontend/src/seo/schema.mjs`

The old guard rejected an empty value, a relative one, `localhost` and `*.vercel.app`. It
could not reject the dangerous case: a real, parsable, non-preview origin that simply is not
this site. Added `PRODUCTION_HOST` and an assertion in `resolveSiteUrl()` under `strict`
(production build + prerenderer only; the runtime keeps its lenient fallback so a config
slip can never blank a live page).

Proven by running the build against three values:

```
VITE_SITE_URL=https://swisspremium.uz        → Error: [seo] … must be https://swisswatchpremium.uz
VITE_SITE_URL=https://sw-preview.vercel.app  → Error: [seo] … must not point at a *.vercel.app preview host
VITE_SITE_URL=https://swisswatchpremium.uz   → ✓ built
```

### A2 — `/api` no longer indexable, and still renderable
`frontend/public/robots.txt`, `frontend/vercel.json`, `backend/src/app.ts`

Confirmed: `/api/*` was crawlable **and** indexable on the storefront domain.

A `Disallow: /api` would have been the wrong fix and actively harmful — the storefront is a
Vue app that fetches its catalog from that same origin (`VITE_API_URL` is empty, so every
request is same-origin), so a crawler blocked from `/api` renders **every page empty**.

Used `X-Robots-Tag: noindex` instead, at both layers, which lets Googlebot read the
endpoints while rendering and still refuses to index them:

- `vercel.json` → header on `/api/(.*)`
- `backend/src/app.ts` → middleware on `/api`, `/sitemap.xml`, `/sitemap-:section`

`/uploads` deliberately carries **no** noindex — it is the product photography, needed for
rendering and wanted in image search.

### A3 — `swiss.techinfo.uz` now has a robots policy
`backend/src/app.ts`

The API host had no `robots.txt` at all, and served a sitemap advertising a *different*
origin's URLs — which reads to a crawler as one site claiming another's pages. Added:

```
User-agent: *
Disallow: /
Allow: /uploads/
```

No `Sitemap:` directive (the sitemap is submitted for the storefront origin only). Robots
rules are per-host, so the storefront's own `robots.txt` and the proxied `/sitemap.xml`
served under `swisswatchpremium.uz` are unaffected.

**Verified live** by booting the compiled backend on port 4599:

```
GET /robots.txt        200   Disallow: / + Allow: /uploads/, no Sitemap line
GET /api/health        200   X-Robots-Tag: noindex
GET /sitemap.xml       500*  X-Robots-Tag: noindex     (*no local MongoDB — header is what mattered)
GET /sitemap-pages.xml 200   X-Robots-Tag: noindex
GET /uploads/…         404   X-Robots-Tag: (none)      ← correct, images stay indexable
```

### A4 — Hardcoded brand removed from the catalog page
`frontend/src/pages/WatchList.vue`

Still hardcoded. `/watches` resolved `fetchBrandBySlug('tsar-bomba')` and scoped the query
to that brand id, so a second brand added to the database would have been **invisible** on
the catalog page and reachable only via `/brands/<slug>`. It was also a single point of
failure: if that one lookup failed, the page rendered empty.

Now `fetchWatches({ type: 'all', limit: CATALOG_LIMIT })` — the facets already derive from
whatever comes back, so they widen on their own as the catalog does. No brand invented; the
data is unchanged.

### A5 — Prerendered HTML and the mounted app now say the same thing
`schema.mjs`, `prerender.mjs`, `HeroSection.vue`, `WatchDetail.vue`, i18n

This was worse than the audit reported. **Every listing page's `<h1>` differed** between the
crawlable copy and what Vue rendered over it:

| Route | Prerendered (before) | App rendered (before) |
|---|---|---|
| `/` | Swiss Watches | SwissWatch Premium |
| `/watches` | Swiss Watches | Timepieces |
| `/brands` | Watch Brands | Premium Brands |
| `/collections` | Watch Collections | Collections |
| `/about` | About | Built on trust. |
| `/contact` | Contact | Speak with SwissWatch Premium |
| `/products/:slug` | Atomic-TB8218 | Atomic-TB8218 |

Added a `heading` field to `staticSeo()` carrying the exact string the app renders, and
pointed the prerenderer at it. Verified after rebuild — all six routes **MATCH**.

### A6 — Product `<h1>` carries the full product name
`prerender.mjs`, `WatchDetail.vue`

`Atomic-TB8218` → `Tsar Bomba Atomic-TB8218`, matching the `<title>` and `Product.name`.

In the app the brand link was a sibling above the `<h1>`; putting the full name in the
heading naively would have printed the brand twice. Instead the brand link moved *inside*
the `<h1>` as a styled block, with `.sw-watch-detail__model` carrying the title size — so
the heading text is the whole product name while the layout is pixel-identical and the
brand keeps its link to the brand page.

### A7 — Template artifacts removed from generated copy
`backend/src/seed/seed.ts`, `schema.mjs`, `WatchDetail.vue`, `prerender.mjs`

12 products shipped `…316L case, and finished with a  dial.` — an empty `dial` field
concatenated anyway — into the product page, the meta description and `Product.description`.

Two-part fix, because the broken text is already in MongoDB:

1. **Source** — `composeDescription()` in `seed.ts` builds clauses conditionally and drops
   empty ones; proper nouns keep their capitalisation. Future seeds are clean.
2. **Output** — `tidyDescription()` in `schema.mjs` repairs existing records on the way out.
   A double space is the tell (it cannot occur in hand-written copy); the comma-delimited
   clause containing it is dropped whole. Nothing is added — it only removes a clause that
   says nothing.

`tidyDescription` is unit-tested; the first version had two bugs the tests caught (a doubled
full stop, and a lost capital when the first clause was the empty one). Both fixed:

```
ok   hole at end   "…from the Atomic line. Crafted with miyota, automatic, housed in a … case."
ok   clean copy    (byte-identical — untouched sentences are never rebuilt)
ok   hole at start "Housed in a 45mm case."
ok   only a hole   ""
all clean
```

**Result: 12 → 0** affected pages in the build.

### A8 — Homepage `<h1>`
`HeroSection.vue`, i18n ×3, `schema.mjs`

Was a hardcoded, unlocalised `SwissWatch Premium` — the shop's name, not what the page is
about, and already present in the wordmark, the `<title>` and the Organization schema.

Now `home.heroTitle`, localised in all three languages:

| | |
|---|---|
| en | Luxury Watches in Tashkent |
| uz | Toshkentda hashamatli soatlar |
| ru | Часы класса люкс в Ташкенте |

Deliberately **not** "Swiss Watches": §16 below explains why that claim is not supportable
by the current catalog. It says what the site is and where it is — which is also the local
signal the site most needs — without asserting Swiss manufacture. One string per language
to change if the inventory ever justifies it.

### A9 — Preloader no longer hides prerendered content
`frontend/index.html`, `frontend/src/main.ts`

Confirmed still true: an opaque full-screen `#sw-preloader` (z-index 9999) sat *on top of*
the prerendered markup until the whole bundle booted — the exact thing prerendering exists
to prevent.

Not removed (it is a deliberate brand intro). Made it stop gating content:

1. **Once per session.** An inline `<head>` script checks `sessionStorage`; after the first
   view the panel is `display: none`, so every navigation and reload paints the prerendered
   content on the first frame.
2. **Hard timeout.** An inline `setTimeout` drops `sw-loading` and fades the panel after
   2.5s regardless of JavaScript. Previously, if the bundle 404'd or a chunk stalled, a
   visitor stared at an opaque panel with fully rendered content behind it.

No layout shift: the panel is `position: fixed` and was never in flow.

### A10 — `og:locale` reflects the actual page language
`schema.mjs`, `utils/seo.ts`, `stores/locale.ts`, `prerender.mjs`

Was hardcoded `en_US` on every page in all three languages. Now derived from the active
language (`uz_UZ` / `ru_RU` / `en_US`) with the other two emitted as `og:locale:alternate`.

This required fixing the client-side DOM sync: `upsertMeta` looked up one element per key,
so repeated `og:locale:alternate` tags would have silently collapsed to one. Replaced with
`syncMeta`, which reconciles all elements sharing a key by position — creating, updating and
removing as needed, and still adopting the tags the prerendered HTML already carries.

### A11 — Default language is browser-aware
`frontend/src/stores/locale.ts`

Was a constant `'uz'` read only from `localStorage`. A crawler has no stored preference, so
**every page Google rendered came out Uzbek** — while the prerendered HTML it was compared
against, the `<title>`, the meta description and the JSON-LD were all English. The page and
its own structured data disagreed about what language they were in.

Now: stored choice → `navigator.languages` → `uz` fallback. Googlebot renders with an
English locale and stays on the English copy its metadata describes; a Russian- or
Uzbek-speaking visitor gets their own language instead of one hardcoded guess. The switcher
is untouched and a stored choice still wins. `localStorage` access is now wrapped in
try/catch (it throws in some privacy modes).

### A12 — `<html lang>` states the prerendered language
`prerender.mjs`

The shell is authored `lang="en"`; the crawlable copy is whatever `SEO_LANG` says. The
prerenderer now rewrites the attribute so the two can never disagree.

### A13 — Product photography cached at the edge
`frontend/vercel.json`, `backend/src/app.ts`

`/uploads/*` had no CDN cache header, and full-size originals came off `express.static` with
the default `maxAge: 0` — revalidation on every request, including the `og:image`. Added
`public, max-age=86400, stale-while-revalidate=604800` at the edge and `maxAge: '1d'` on the
static handler. Deliberately not `immutable`: an admin replacing an image at the same path
should not be stale for a week.

---

## B. Not fixed — and why

| # | Item | Why not |
|---|---|---|
| B1 | **`/uz/`, `/ru/`, `/en/` URL routing + hreflang** | The single biggest remaining SEO gap, and too large to do safely inside this task. Requires router changes, prerendering ×3, hreflang clusters with `x-default`, per-locale canonicals, localised `staticSeo` strings, and sitemap `xhtml:link` alternates. A partial migration is worse than none. Architecture spec in §C below. **Estimate: 3–5 days.** |
| B2 | **"Swiss Watches" in titles and descriptions** | A business/content decision, explicitly out of scope per your §16. Exact locations listed in §16 below. |
| B3 | **Crawlable pagination (`?page=2`)** | Catalog is 94 products; `/watches` renders all of them and the prerendered brand page links all 94. Adding pagination now would create thin URLs for no gain. Ceiling documented in code (`CATALOG_LIMIT = 250`). Revisit past ~250 products. |
| B4 | **`priceValidUntil`, `itemCondition`, `shippingDetails`, `hasMerchantReturnPolicy`** | Needs real business data (see §17). Adding them without it would be fabrication. |
| B5 | **`LocalBusiness` / address / `/stores`** | `locations.json` is `[]`. The code is fully wired — filling that one file activates the route, the prerendered page, the sitemap entry, the footer link and `JewelryStore` JSON-LD. Blocked on a real address. |
| B6 | **Existing broken descriptions in MongoDB** | Repaired on output (A7), but the stored text is still broken. Fixed permanently by a re-seed or a one-off repair script — your call, since it touches live data. |
| B7 | **Lowercased proper nouns in existing rows** (`miyota`, `stainless steel 316l`) | Generator fixed for future seeds; existing rows unchanged. Cosmetic, not a blocker. |
| B8 | **Hydration replaces the prerendered DOM** | Inherent to `app.mount()` on a non-SSR app. True hydration needs `createSSRApp` + byte-matching markup, i.e. an SSR migration — explicitly excluded. Mitigated instead by making the two agree (A5, A6, A11, A12). |
| B9 | **Reviews / ratings** | No review system exists. Not fabricated. |
| B10 | **`/watches` has no brand facet** | Now brand-agnostic in data, but there is no UI filter by brand. Not needed with one brand; add when a second exists. |

---

## C. Architecture needed for multilingual SEO (B1)

Not implemented — specification only.

1. **Routes** — `/:lang(uz|ru|en)?/...`, with `uz` at the bare path or a redirect from `/`.
2. **Prerender** — run `prerender.mjs` once per language (`SEO_LANG=uz|ru|en`), writing
   `dist/uz/...`, `dist/ru/...`, `dist/...`. The API is already language-aware (`?lang=`).
3. **hreflang** — in `headTags()`, emit `<link rel="alternate" hreflang="uz|ru|en|x-default">`
   for all four, on every page.
4. **Canonical** — self-referential per locale, not cross-locale.
5. **Metadata** — `staticSeo()` strings currently hardcoded English must move into, or be
   parameterised by, the dictionaries.
6. **Sitemap** — one `<url>` per locale with `<xhtml:link>` alternates; backend
   `sitemapController.ts` needs the locale list.
7. **Language switcher** — must navigate rather than mutate state, preserving the path.

---

## D. Verified (by inspecting, building, or running)

- Full production build succeeds: **120 pages → 94 products, 1 brand, 9 collections**.
- **120/120 canonicals** on `https://swisswatchpremium.uz`. Zero `swisspremium.uz`,
  `localhost` or `vercel.app` in any built HTML, XML or TXT.
- Host pin rejects a wrong-but-real domain and a preview host; accepts the correct one.
- Exactly one `<h1>` per indexable page; `404.html` correctly `noindex, follow`.
- Prerendered `<h1>` **matches** the app's rendered `<h1>` on all six static routes.
- Product `<h1>` = `Tsar Bomba Atomic-TB8218`; `Product.name` identical.
- Template artifacts: **12 → 0**.
- `og:locale` + two `og:locale:alternate` on every page.
- Backend `robots.txt`, `X-Robots-Tag` on `/api` and `/sitemap*`, and **no** noindex on
  `/uploads` — all confirmed against a running server.
- `tidyDescription()` unit-tested, 6 cases, all clean.
- `vue-tsc -b` (frontend) and `tsc --noEmit` (backend) both exit 0.
- `sitemap-pages.xml` contains 6 correct absolute URLs, no admin/account/cart paths.
- Catalog composition re-verified: 94 products, brand = `{'Tsar Bomba': 94}`.

### Per-page validation (from the build)

| URL | H1 | robots | canonical | JSON-LD |
|---|---|---|---|---|
| `/` | Luxury Watches in Tashkent | index, follow | ✅ | Organization, WebSite |
| `/watches` | Timepieces | index, follow | ✅ | Organization, ItemList, BreadcrumbList |
| `/brands` | Premium Brands | index, follow | ✅ | Organization, ItemList |
| `/collections` | Collections | index, follow | ✅ | Organization, ItemList |
| `/brands/tsar-bomba` | Tsar Bomba | index, follow | ✅ | Organization, BreadcrumbList, ItemList |
| `/collections/atomic` | Atomic | index, follow | ✅ | Organization, BreadcrumbList, ItemList |
| `/products/…-tb8218` | Tsar Bomba Atomic-TB8218 | index, follow | ✅ | Organization, Product, BreadcrumbList |
| `/about` | Built on trust. | index, follow | ✅ | — |
| `/contact` | Speak with SwissWatch Premium | index, follow | ✅ | — |
| `/404` | (SPA renders) | **noindex, follow** | ✅ | — |

---

## E. NOT verified — requires a live deployment

- **HTTP status codes.** `api/spa.js` returns 404 for unknown paths and 200 on API failure —
  read in code, never executed against Vercel.
- **Vercel `headers` on proxied rewrites.** The `X-Robots-Tag` on `/api/(.*)` is configured;
  whether Vercel applies it to an externally-rewritten response is unconfirmed. **The backend
  middleware (A2) is the belt-and-braces that makes this safe either way**, and *that* is
  verified.
- **`/sitemap.xml` in production.** Served by the backend from `env.SITE_URL`. The VPS value
  could not be read. **Check `curl https://swisswatchpremium.uz/sitemap.xml` first after deploy.**
- **The 308 redirect** `/watches/:slug` → `/products/:slug` at the edge.
- **Client-side `og:locale` / `syncMeta`** — typechecked, not exercised in a browser.
- **The browser-language default and the session preloader** — logic reviewed, no browser run.
- **All Core Web Vitals.** No Lighthouse, no CrUX, no field data. Build-measured bundle sizes
  are real: entry `257.83 kB / 94.72 kB gzip`, locale chunk `84.62 kB / 32.92 kB gzip`,
  route chunks 2–17 kB, total 564 kB JS + 156 kB CSS uncompressed. **These are sizes, not
  vitals.** LCP/INP/CLS remain unmeasured.
- **Whether Googlebot renders the app at all**, and in which language.

---

## F. Business / content decisions — NOT technical SEO

Re-verified; unchanged.

**The catalog is 100% Tsar Bomba.** 94 products, `brand = {'Tsar Bomba': 94}`.

**Movements**, from the built pages:

| Movement | Count | Swiss? |
|---|---|---|
| Miyota, Automatic | 10 | No (Japanese) |
| Automatic (unspecified) | 9 | Unknown |
| Quartz (unspecified) | 5 | Unknown |
| **Swiss Ronda, Quartz** | **4** | **Yes** |
| Japanese, Automatic | 3 | No |
| Epson, Automatic | 3 | No (Japanese) |
| **Swiss Sellita, Automatic** | **2** | **Yes** |
| Seiko, Quartz | 2 | No (Japanese) |
| Miyota 9100 / Japanese variants | 3 | No |

**6 of 41 watches with a declared movement are Swiss (~15%).**

**Is "Swiss Watches" factually accurate? No** — not as a site-wide claim.

Product-level structured data has never made a false Swiss claim
(`grep -li "swiss made\|swiss movement" dist/products/*.html` → **0**). The claim lives only
in site-level marketing copy:

| File | Line | String |
|---|---|---|
| `schema.mjs` | ~386 | `title: pageTitle('Swiss Watches', site)` — homepage `<title>` |
| `schema.mjs` | ~387 | `Authenticated Swiss watches in Tashkent, Uzbekistan…` |
| `schema.mjs` | ~392 | `title: pageTitle('Swiss Watches Catalog', site)` |
| `schema.mjs` | ~393 | `Browse every Swiss watch available at…` |
| `schema.mjs` | ~405 | `Curated Swiss watch collections at…` |
| `schema.mjs` | ~364 | collection fallback: `Swiss watches selected for this line…` |
| `i18n/en.ts` | 270 | `Direct relationships with Swiss ateliers.` |
| `i18n/en.ts` / `ru.ts` | 315 / 318 | hero `imageAlt`: `A Swiss timepiece…` |

**I changed none of these** — §16 said report, don't rewrite. Three honest options:

- **(a)** Stock Swiss brands. The architecture already supports it (A4 removed the blocker).
- **(b)** Reposition to "luxury / enthusiast watches in Tashkent" — which is what A8's H1 now
  says — and target `Tsar Bomba Uzbekistan`, `soat do'koni Toshkent`, `часы Ташкент`, where
  you would be the definitive result against no competition.
- **(c)** Keep "Swiss" only for the 6 Ronda/Sellita pieces behind a real `/swiss-made` page.

Note the current inconsistency this leaves: the homepage `<h1>` now says "Luxury Watches in
Tashkent" while the `<title>` still says "Swiss Watches". That is deliberate and visible
rather than hidden — resolve it with option (a), (b) or (c).

---

## G. Local SEO — what only you can provide

| Signal | Status |
|---|---|
| Phone | ✅ `+998 88 500 20 20` — Organization, contactPoint, footer |
| Email | 🟡 present, but a personal iCloud address. A `@swisswatchpremium.uz` mailbox is worth more than most on-page work |
| "Tashkent, Uzbekistan" in copy | ✅ throughout, and now in the homepage `<h1>` |
| Instagram | ✅ one `sameAs` |
| **Street address** | ❌ **`locations.json` is `[]`** |
| **`PostalAddress` / `LocalBusiness`** | ❌ correctly withheld — nothing to publish |
| **`/stores`** | ❌ route not registered; 404s |
| **Opening hours / geo / map** | ❌ none |
| **Google Business Profile** | ❌ not established — cannot be done in code |

Fill `frontend/src/data/locations.json` and **everything below activates automatically**:

```jsonc
[{ "name": "SwissWatch Premium Tashkent",
   "streetAddress": "…", "addressLocality": "Tashkent", "addressRegion": "Toshkent shahri",
   "postalCode": "…", "addressCountry": "UZ", "telephone": "+998 88 500 20 20",
   "openingHours": ["Mo-Sa 10:00-20:00"], "geo": { "latitude": 0, "longitude": 0 },
   "mapUrl": "…" }]
```

→ `/stores` route + prerendered page + sitemap entry + footer link + `JewelryStore` JSON-LD
with address, hours and coordinates.

**Without a physical address you cannot rank for `swiss watch Tashkent`.** Google requires a
verified local entity for local-intent queries. That, plus a verified Google Business Profile
(and Yandex Business, which matters in UZ), is the #1 non-code blocker.

---

## H. Scores

Compared against the original audit, which was penalised heavily for a domain problem that
did not exist.

| Area | Was | Now | Why |
|---|---|---|---|
| **Technical SEO** | 66 | **84** | Domain was never broken (+). API noindex, API-host robots, host pin, prerender/render consistency, `<html lang>`, edge caching all fixed. Still: no crawlable pagination, soft-404 at `/404`, hydration replaces the DOM |
| **Ecommerce SEO** | 52 | **63** | Hardcoded brand gone, full-name H1s, clean descriptions, Product/Offer already solid. Still: no reviews, 20% sold out, no `itemCondition`/`priceValidUntil`, USD pricing in a UZS market |
| **On-page SEO** | 50 | **68** | H1s consistent and meaningful, template artifacts gone, `og:locale` correct. Still: ~500 words of prose sitewide, title/H1 Swiss inconsistency pending your decision |
| **International SEO** | 12 | **28** | `og:locale` correct, browser-aware default, `<html lang>` consistent. Still **no per-language URLs and no hreflang** — two of three languages remain unindexable. This is the ceiling until B1 is done |
| **Local SEO** | 18 | **22** | H1 now carries "Tashkent". Everything else still blocked on a real address and a GBP |
| **Performance** | 55 | **62** | Preloader no longer gates content after first view; hard timeout; `/uploads` cached. **Still unmeasured** — treat as a hypothesis |
| **Off-page** | 5 | **5** | Unchanged. Not a code problem |
| **Overall** | 42 | **58** | Technically much closer to ready. Held down by international SEO, thin content, no local entity, and the catalog/positioning mismatch |

---

## I. The final question

> *"If I deploy this code to Vercel, connect swisswatchpremium.uz through Ahost DNS, and
> submit sitemap.xml to Google Search Console, is the website technically ready for Google
> crawling and indexing?"*

# PARTIALLY — and yes, it is safe to deploy.

**Nothing will now break indexing.** That is a real change from the previous audit, most of
which turned on a domain defect that never existed. Google will crawl, render and index this
site correctly:

- ✅ every canonical, `og:url`, JSON-LD `@id` and sitemap URL on `https://swisswatchpremium.uz`
- ✅ real HTTP 404s; an API outage serves 200, not a mass deindex
- ✅ prerendered HTML with real headings, copy, links, breadcrumbs and structured data
- ✅ prerendered and rendered content now agree
- ✅ valid Product / Offer / Brand / Organization / WebSite / BreadcrumbList / ItemList
- ✅ faceted URLs canonicalised and noindexed; account, admin and `_shell` excluded
- ✅ API endpoints readable-but-unindexable; the API host no longer advertises itself
- ✅ a build that refuses to ship a wrong canonical host

**Why not YES:**

1. **Two of three languages are unindexable.** No `/uz/`, `/ru/`, `/en/` URLs, no hreflang.
   In this market that forfeits the majority of addressable search volume. **(B1)**
2. **No local entity.** No address, no `LocalBusiness`, no `/stores`, no GBP — so
   `swiss watch Tashkent` is unrankable regardless of technical quality. **(G)**
3. **Content/inventory mismatch.** "Swiss Watches" over a 100% Tsar Bomba catalog with ~15%
   Swiss movements. Technical SEO cannot fix, and should not disguise, this. **(F)**
4. **~500 words of prose sitewide.** No guides, no FAQ, no editorial layer.
5. **Core Web Vitals unmeasured.** Run Lighthouse against the deployment before believing
   any performance claim, mine included.

**Deploy it.** It is technically sound and will index correctly. Then, in order:
verify `curl https://swisswatchpremium.uz/sitemap.xml` returns the right host, run
Lighthouse, decide the Swiss question, get the address into `locations.json`, claim the
Google Business Profile, and schedule the multilingual routing work.
