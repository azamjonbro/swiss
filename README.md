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

The storefront's header "Account" link opens the admin panel at `VITE_ADMIN_URL` (defaults to
`http://localhost:5175`); the admin panel's "View Site" link opens the storefront at `VITE_STORE_URL`
(defaults to `http://localhost:5173`). Set these env vars if you deploy the two apps to different
domains. The backend's `CORS_ORIGINS` env var (comma-separated) controls which origins may call the
API — it defaults to both dev ports.

## Admin panel

Visit `http://localhost:5175/login`. The seed script creates one superadmin account and prints its
credentials to the console when it runs — by default:

- **Email:** `azamjonbro@gmail.com`
- **Password:** `SwissWatch2026!`

Override these by setting `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before running `npm run seed`.

From the admin panel you can manage watches, brands, categories, collections, inquiries, and media —
all changes are reflected immediately on the public site.

## Notes

- Product, brand, and category imagery is placeholder art generated on the fly (an abstract watch-dial
  motif in the site's palette) — replace it with real photography through the admin media uploader.
- Videos are optional throughout; `SmartVideo` gracefully falls back to a poster image wherever no
  video source is set.
- `npm run build` in `frontend/` and `admin/` type-checks with `vue-tsc` and produces a production
  build; `npm run build` in `backend/` compiles TypeScript to `dist/`.
# swiss
