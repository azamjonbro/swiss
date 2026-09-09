# SwissWatch Premium — session handoff

Paste this into a fresh Claude Code session in `/Users/mac/Desktop/swisswatch`.
Written 2026-09-09. Everything described as "done" is committed on `main` in
`2153e30..ce51963`; the working tree was clean and both type-checks green at
handoff.

**The user writes in Uzbek — reply in Uzbek.** The codebase, comments and commit
messages are English; keep it that way.

---

## 1. What this project is

Three apps in one repo:

| Path | What | Notes |
|---|---|---|
| `frontend/` | Vue 3 + Vite storefront | Deployed on Vercel |
| `admin/` | Vue 3 admin panel | Separate origin |
| `backend/` | Express + Mongoose API | pm2 on the `homeserver` box, port 4200, behind Cloudflare |

Production URLs:

- Storefront **https://www.swisswatchpremium.uz** (bare domain 308s to `www`).
- `vercel.json` rewrites `/api/*` and `/uploads/*` to `https://swiss.sds-max.uz`.
  Hitting `swiss.techinfo.uz` directly failed from a laptop — go through the
  `www` host when you need to inspect production data or images.

Deploy gotcha: pm2 runs `dist/`, so `git pull` alone ships nothing on the
backend. `npm run build` then restart.

---

## 2. Work completed this session

### 2.1 Catalogue pagination (`frontend/src/pages/WatchList.vue`)

15 products per page, `?page=N`. The page numbers are real `<RouterLink>`
anchors, not buttons, so a crawler can walk past the first page. Page 1
canonicalises to `/watches`, page N to `/watches?page=N`, both `index, follow`;
a *filtered* view is still `noindex, follow` as before. The JSON-LD ItemList
now describes the page actually on screen instead of a 60-item digest.

### 2.2 Header logo lockup (`frontend/src/components/shared/BrandMark.vue`)

On ≤640px the glyph used to move *above* the wordmark and the name shrank to
`0.44rem` (~7px). It is now a proper side-by-side lockup at every width, with
the name broken over two lines beside the glyph (two explicit spans, so the
break point is the design's choice and not the text renderer's).

### 2.3 Blur (LQIP) placeholders (`frontend/src/components/shared/SmartImage.vue`)

A blurred low-res stand-in paints under every photograph until the real file
lands, cross-dissolving as it arrives. Two sources:

- **Product photography** — a real `?w=240` fetch (2–3 KB). 240 is deliberate:
  it is the *narrowest width the deployed API already serves*, so this needed no
  backend release. `?w=24` is **not** in `ALLOWED_WIDTHS` and falls straight
  through to the full-size original — do not use it without shipping the server
  change first.
- **Editorial photography** — inlined as base64 at build time by
  `frontend/scripts/responsive-images.mjs` into `frontend/src/data/image-lqip.json`
  (9 entries, ~2 KB total, zero extra requests). Re-run that script after
  adding or replacing anything in `frontend/public/images/`.

### 2.4 The listing-speed fix — **the important one**

The measured cause of slow images on `/watches`:

`SmartImage`'s `preferTrimmed` asked for `<name>_trim.webp`, then
`<name>_trim.png`, **before** requesting the real photograph. **No `_trim` file
exists anywhere on the server.** Measured against production:

| Request | Result | Time |
|---|---|---|
| `..._trim.webp` | **404** | 1393 ms |
| `..._trim.png` | **404** | 1393 ms |
| `...jpg?w=480` | 200, 5.9 KB | 1260 ms |
| `...jpg?w=240` | 200, 2.3 KB | ~530 ms warm |

`WatchCard` renders two shots, so every card burned four serial round trips
discovering nothing — ~96 wasted requests per 24-card page, through a
six-connection budget. Baseline latency to that host is ~530 ms **regardless of
file size**, so round trips, not bytes, are what the page pays for.

Fixes shipped:

- The trim guess is now behind `VITE_TRIMMED_UPLOADS` (see
  `frontend/src/vite-env.d.ts`), **default off**. Turn it on only after the
  derivatives actually exist — see §3.4.
- `WatchCard`'s hover shot mounts on first `pointerenter`/`focusin`. On a touch
  device it never loads at all, halving the listing's image count.
- The first four covers get `eager` + high priority via a new `priority` prop.

### 2.5 Brand maison card (`frontend/src/components/home/BrandMaisonCard.vue`)

The user's screenshot showed a hard-edged white rectangle floating inside the
black plaque. Cause: `SmartImage`'s own `--surface-media` ground showing through
an 8%-inset layer. The watch layer is now full-bleed with a white plate of its
own and `padding` for breathing room, so the card flips from engraved plaque to
lit studio plate with no seam. Works both before and after the `_trim`
derivatives exist.

### 2.6 Colourway grouping — models, not dial colours

**The problem.** The maisons publish every dial colour as its own product and
the importer stored them that way. `PRX 40mm` is **21 separate documents**. The
grid drew 21 identical cards reading "PRX 40mm · Quartz · UZS 5,491,200". In a
400-product sample, **318 documents collapse into 57 models** (400 → 139 cards).

**Why they were not merged into one document.** Those 21 share a name and
almost nothing else: five of them are called *Blue*, the price runs **$408 to
$973**, the movement from quartz to Swiss automatic, the case from steel to
gold-capped. One merged document would have to publish one price and one spec
sheet that were wrong for most of its own colourways, and would delete 20 live
product URLs. So this is a **grouping key, not a merge** — every colourway keeps
its own document, price, spec sheet and address.

**What was built:**

- `Watch.modelGroup` (indexed) = `modelGroupKey(name)` — see
  `backend/src/utils/modelGroup.ts`. It normalises `40 mm` / `40MM` / `40-mm`
  to `40mm`, because the scrapers are not consistent about it.
- Set automatically in `adminCreateWatch` / `adminUpdateWatch` and in the
  importer, so a colourway added by hand joins its model without anyone knowing
  the field exists.
- `GET /watches?group=model` (`listModels` in `watchController.ts`) returns one
  row per `{brand, type, modelGroup}` — the **cheapest** colourway as the
  representative, the rest attached as `siblings`. Grouping by `_id` when
  `modelGroup` is empty, so un-backfilled products stay groups of one.
- `GET /watches/:slug` now also returns `siblings` (the model's other
  colourways: slug, price, movement, availability, first variant).
- Frontend `frontend/src/utils/modelGroup.ts`: `modelMembers`, `modelColors`
  (deduped by slug — five "Blue" dots would read as a bug), `modelPriceRange`,
  `modelSize`. All degrade cleanly when `siblings` is absent.
- `WatchCard` shows the model's full colour range (6 swatches + "+N") and a
  **"from" price** when the colourways differ.
- `WatchList` fetches with `group: 'model'`. **Every facet now reads the whole
  model**, and the filter predicate requires *one colourway to satisfy all
  filters at once* — asking for "green" + "under $500" must not match a model on
  the strength of a cheap silver dial.
- `WatchDetail` gained an "Other colours in this model" strip (thumbnail +
  colour label + that colourway's own price) linking to the sibling product.

Side benefit: `WatchList`'s `CATALOG_LIMIT` is 600 and the ungrouped catalogue
is **926 products** — the single fetch was silently truncating. Grouped it is
~350. Watch that number if the catalogue keeps growing.

### 2.7 Collections from `series`

Only **9 collections** exist and all are Tsar Bomba series. `importBrandCatalog.ts`
read the per-product `series` field into a *sentence of product copy* and never
created a Collection or set `collectionRef`. The data was there all along:
Tissot 22 series, Citizen 18, Saint Honoré 13, Seiko 8 (Jacques Philippe: none).

- `Collection.brand` added (optional — the original nine predate it).
- `listCollections` populates `brand`.
- The importer now creates the Collection and links both sides
  (`collectionRef` on the watch, `$addToSet` into `Collection.watches`).
  Slugs stay short (`le-locle`) unless two maisons genuinely clash.
- `backfillCollections.ts` does the same for the ~900 already imported.

### 2.8 Cover-image selection

`variants[0].images[0]` is what the card shows, and the catalogues do not agree
what that is — the user's screenshot had a dial, a dial, a bracelet close-up on
purple, a wrist in a suit, and a presentation box, all as covers of the same
model.

`backend/src/seed/orderCovers.ts` promotes the studio shot: keep only images
whose **border is genuinely white** (mean luma ≥ 0.96, spread ≤ 8 — this alone
rejects every lifestyle shot, the dark "lume" shots and the box), then take the
one with the **largest content bounding box** (a front view beats a side profile
beats a bare case back). Everything else keeps its order.

**Validated 3/3 on real production images**, including a case where image 1 was
a dark lume shot and the correct cover was image 2. A product whose photography
is entirely lifestyle is left untouched rather than reordered on a guess.

---

## 3. Not done — pick up here

### 3.1 Run the migrations (needs the server; all dry-run by default)

```bash
cd backend
npm run backfill:models              # report
npm run backfill:models -- --apply

npm run backfill:collections
npm run backfill:collections -- --apply

# Reads image files, so it must run where uploads/ lives:
npm run order:covers
npm run order:covers -- --apply
```

Then `npm run build` and restart pm2 — pm2 runs `dist/`.

Until `backfill:models --apply` runs, the grouped listing falls back to one
group per product, i.e. exactly the old behaviour. Nothing breaks; nothing
improves either.

### 3.2 Home hero image (user asked, not started)

Replace the Saint Honoré hero with the **West End Watch Co. Sowar** (green dial,
steel bracelet) the user attached.

- Source: `/Users/mac/.claude/image-cache/22d84763-377a-419b-9fa4-7447fbc1f079/2.png`
  — 660×1200, pure white backdrop, **bracelet runs off the top and bottom
  edges** (its content bbox is the full frame height).
- Current hero: `frontend/public/images/sainthonore_monceau.jpg`, 2048×1152,
  dark textured stone, watch right of centre, referenced as `heroImage` in
  `frontend/src/components/home/HeroSection.vue`.
- The user chose "replace the image (background will need darkening/gradient)".
  Plan that was in progress: key the white backdrop (border-connected flood fill,
  RGB tolerance ~34 — measured, gives a clean cut), build the ground from the
  current hero's watch-free left strip (crop `0,0,300,1152`, mirror-tile to
  2048, Gaussian blur ~6), composite the watch at ~88% frame height centred
  around 53–56% of the width. Below ~63% it starts getting cut by a phone's
  centre crop — the existing hero has the same behaviour, so match it, don't
  beat it.
- Afterwards: `node frontend/scripts/responsive-images.mjs` (regenerates width
  variants **and** the LQIP manifest), update `home.heroImageAlt` /
  `home.statementAlt` in all three `frontend/src/i18n/*.ts`, and consider the
  OG card `frontend/public/og/sainthonore-monceau.jpg` (referenced as
  `defaultImage` in `frontend/src/seo/schema.mjs`).

### 3.3 Admin panel (user: *"soat qo'shish qismiga ham shu narsaga e'tibor ber"*)

`modelGroup` is already set automatically by the controller, so a colourway
added in the admin joins its model correctly. What is missing is the UI:

- `admin/src/pages/admin/AdminWatchForm.vue` — when the name matches an existing
  model, say so ("this joins PRX 40mm, 21 colourways") so the operator knows a
  new document is a colourway and not a new card.
- `admin/src/pages/admin/AdminWatches.vue` — the listing is ungrouped (correct
  for editing individual products), but a model column or a group filter would
  make the 926-row list navigable.

### 3.4 Background removal, then flip the flag

`backend/scripts/remove-product-bg.py` was tested on real production images this
session and produces clean cutouts. Run it on the server:

```bash
python3 backend/scripts/remove-product-bg.py
```

Then, and only then, set `VITE_TRIMMED_UPLOADS=1` in the frontend env and
redeploy. Setting it while the files are missing reintroduces the 404 chain
described in §2.4 — that flag is the whole safety mechanism.

Note: `SmartImage`'s doc comment claims the trims come from "real ML
segmentation (rembg/u2net)". They do not — the script is a border-seeded flood
fill. Worth correcting when you touch that file.

### 3.5 Brand logo / banner artwork

All 12 brands' `logo` (1024×1280) and `image` (2048×878) are the **same
synthetic dark plaque**: a wordmark set above centre on a near-black ground
(border luma ≈ 21) with a faint inner rule box. They are not photographs.

- `BrandList.vue` draws the banner at `aspect-ratio="16 / 10"` with the default
  `object-fit: cover` → the plaque is cropped and reads as a black rectangle in
  the light theme.
- `BrandDetail.vue` uses it full-bleed as a hero → heavier crop still.

Options: extract the wordmark to a transparent, tightly-cropped derivative (the
artwork is white-on-near-black, so a luminance key is trivial) and render it
`contain` on a deliberate dark plaque; or use CSS `mask-image` + `currentColor`
so the wordmark takes the theme's ink. Nothing has been done here yet.

---

## 4. Facts worth not re-deriving

- **926 products** in the database. The brand catalogues in `backend/src/seed/`
  hold **1722** between them (Tissot 464, Citizen 463, Jacques Philippe 338,
  Seiko 287, Saint Honoré 86, West End Watch Co. 84), plus
  `tsarbomba-import.json`, which is a bare array and read by a different script
  (`importCatalog.ts`). So a good deal is not imported yet — note that
  Jacques Philippe, Saint Honoré and West End publish no prices and import
  deactivated by design.
- Only **Tissot (273)** and **Seiko (127)** appear in the first 400 rows of the
  default sort.
- Brands: cerruti-1881, citizen, frederique-constant, jacques-philippe, rado,
  roamer, saint-honore, seiko, swiss-military-hanowa, tissot, tsar-bomba,
  west-end-watch-co.
- `ALLOWED_WIDTHS` (`backend/src/middleware/resizeImages.ts`): 240, 480, 720,
  960, 1440. The middleware re-encodes to AVIF when the client advertises it,
  WebP otherwise, and caches to disk. It **works in production** — verified.
- No SMTP anywhere: registration signs in directly, there is no password
  recovery, and Turnstile fails open when keys are unset.
- `frontend/.env`: `VITE_API_URL` empty (Vite dev proxies `/api`, `/uploads`,
  `/sitemap.xml`); `SEO_API_URL=https://swiss.techinfo.uz` for the prerenderer.
- Local dev: Mongo is seeded but `uploads/` is empty, so **product images 404
  locally**. Inspect real imagery through the production host instead.
- Ports 4000/5173 belong to a different project on this machine.
