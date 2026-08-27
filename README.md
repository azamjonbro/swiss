# SwissWatch

A premium Swiss watch boutique platform — Vue 3 + Vite storefront, a separate Vue 3 + Vite admin
panel, and an Express + MongoDB backend shared by both.

```
frontend/   Storefront — Vue 3, TypeScript, Vue Router, Pinia, Lenis, GSAP
admin/      Admin panel — Vue 3, TypeScript, Vue Router, Pinia (own app, own port, own design system)
backend/    Node.js, Express, TypeScript, MongoDB, Mongoose, JWT — serves both frontends
```

The admin panel is a fully independent app — its own `package.json`, dev server, and visual identity
(sans-serif type, blue accent) distinct from the storefront's luxury branding (serif type, burgundy
accent). It talks to the same backend API.

## Prerequisites

- Node.js 20+
- MongoDB running locally (or a connection string to a remote instance)

## Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env      # edit if your Mongo URI or ports differ
npm run seed               # populates the database with demo brands, categories, watches, and an admin user
npm run import:catalog     # pulls in the rest of the tsarbomba.com line-up and rebuilds the collections
npm run dev                 # http://localhost:4000

# Storefront (in a second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173

# Admin panel (in a third terminal)
cd admin
npm install
npm run dev                 # http://localhost:5175
```

Both frontends proxy `/api` and `/uploads` to the backend on port 4000 in development (see each
project's `vite.config.ts`), so all three must be running together.

The storefront's header "Account" link opens the **customer** account at `/account` — never the admin
panel. The admin panel's "View Site" link opens the storefront at `VITE_STORE_URL` (defaults to
`http://localhost:5173`). The backend's `CORS_ORIGINS` env var (comma-separated) controls which
origins may call the API — it defaults to both dev ports.

## Authentication

Customer and admin sessions are entirely separate and cannot be used in place of one another:

| | Customer | Admin |
| --- | --- | --- |
| App | storefront (`frontend/`, port 5173) | admin panel (`admin/`, port 5175) |
| Sign in at | `/account/login` | `/login` (admin app only) |
| API | `/api/account/*` | `/api/auth/*`, `/api/admin/*` |
| Model | `User` | `Admin` |
| Token audience | `customer` | `admin` |
| Cookie / storage key | `customer_token` / `sw-customer-token` | `token` / `sw_admin_token` |

Both tokens are signed with the same `JWT_SECRET` but carry mutually exclusive audiences, so a
storefront token is rejected by every admin route and an admin token is rejected by every customer
route. There is no link from the storefront to the admin panel.

### Customer account

`/account` (sign-in required) holds the customer's details, order history, saved timepieces, and
settings. The public authentication screens live at `/account/login`, `/account/register`,
`/account/forgot-password`, `/account/reset-password`, and `/account/verify-email`.

Registration takes first name, last name, email, phone, and password. Sign-in accepts **either** the
email or the phone number — phone numbers are normalised to `+998XXXXXXXXX`, so `90 123 45 67`,
`901234567`, and `+998 90 123-45-67` all resolve to the same account. A new account must confirm its
email address before it can sign in; with no SMTP configured, the confirmation and password-reset
links are printed to the backend console instead of being emailed.

## Admin panel

Visit `http://localhost:5175/login`. The seed script creates one superadmin account and prints its
credentials to the console when it runs — by default:

- **Email:** `azamjonbro@gmail.com`
- **Password:** `SwissWatch2026!`

Override these by setting `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before running `npm run seed`.

From the admin panel you can manage watches, brands, categories, collections, inquiries, and media —
all changes are reflected immediately on the public site.

## Catalogue

The hand-written `seed.ts` carries a curated subset of Tsar Bomba's line-up with copy and
spec sheets written for this store. Everything else comes from the brand's own storefront:

```bash
cd backend
python3 scripts/fetch-tsarbomba.py   # downloads photography + writes src/seed/tsarbomba-import.json
npm run import:catalog               # inserts the models and rebuilds the collections
```

`fetch-tsarbomba.py` reads tsarbomba.com's Shopify endpoints, so the product list, colourway
split, prices, and photography are the brand's own data rather than a guess. Two things
Shopify does not expose are the spec sheet and any real product copy — every listing's
`body_html` is shipping boilerplate — so movement and case material are read off the site's
attribute collections (Automatic Watches, Carbon Fiber Watches, …) and **case size, dial,
bracelet, and water resistance are left blank on imported models** for an editor to fill in
from the admin panel. Both scripts are safe to re-run: photography already on disk is not
re-downloaded and watches already in the database are not touched.

`import:catalog` also rebuilds the collections to match how tsarbomba.com organises its
line-up — eight men's series (Elemental, Atomic, Dark Matter, Light Matter, Neutron, Reactor,
Electron, Skunk Works) plus the women's Nucleus Femme — replacing the demo seed's
`heritage-icons` / `new-arrivals` pair. Both `Collection` and `Watch` carry a `gender`, because
a women's edition can live inside a men's series (Light Matter TB8223 and Atomic TB8218 both
ship in one); `/api/watches?gender=women` filters on it, and the storefront's collections page
groups the two audiences under separate headings.

After adding new product photography, generate the card thumbnails:

```bash
python3 backend/scripts/remove-product-bg.py                      # everything missing one
python3 backend/scripts/remove-product-bg.py tsarbomba_tb8228a    # or just these prefixes
```

## Notes

- Product, brand, and category imagery lives in two places, matching what it's for:
  - **Real product photography** (watch galleries, brand logos) is tracked in MongoDB and served from
    `backend/src/uploads/` (`images/` and `videos/`) — the same place anything uploaded through the
    admin panel's media uploader lands. `seed.ts` points at this folder; a brand or watch with no real
    photo yet falls back to placeholder art generated on the fly (an abstract watch-dial motif in the
    site's palette).
  - **Editorial/decorative photography** (homepage hero, About, the full-bleed menu previews, the
    auth screen background) stays static in `frontend/public/images/` — these are above-the-fold or
    LCP-critical images, so they ship with the frontend bundle instead of round-tripping through the
    API.
  - `backend/src/uploads/` is gitignored (matching how admin uploads have always worked) and lives on
    the backend's own filesystem — `backend/vercel.json` deploys the API as serverless functions, whose
    filesystem is ephemeral, so this folder needs a persistent volume or object storage (S3, R2, etc.)
    behind it before deploying there for real; it's fine as-is for local development.
- Every image under `frontend/public/images/`, and everything in `backend/src/uploads/images/` that
  was seeded from there, ships as both `.jpg` and `.webp`. `SmartImage` requests the `.webp` first and
  falls back to the original on error, so when you add a new file to either location, generate its
  sibling too:

  ```bash
  cd frontend/public/images   # or backend/src/uploads/images
  cwebp -q 82 -m 6 new-photo.jpg -o new-photo.webp
  ```

  A `.webp` probe against a photo with no sibling (e.g. a fresh, one-off admin upload) just costs one
  failed request before `SmartImage` falls back to the original — harmless, no broken image.
- Videos are optional throughout; `SmartVideo` gracefully falls back to a poster image wherever no
  video source is set.
- `npm run build` in `frontend/` and `admin/` type-checks with `vue-tsc` and produces a production
  build; `npm run build` in `backend/` compiles TypeScript to `dist/`.
# swiss
