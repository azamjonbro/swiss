/**
 * Where the build learns who the site is.
 *
 * `vite.config.ts` uses this to fail a production build outright when the
 * canonical origin is missing or still points at localhost, and
 * `prerender.mjs` uses it to build the same `site` record the app does. A
 * silent fallback to localhost is what produced the first bad sitemap; the
 * only way to make that impossible is to refuse to build.
 *
 * The `.env` reader exists because `prerender.mjs` runs as a plain Node
 * process after `vite build` — Vite has already exited, so nothing has loaded
 * the project's `.env` files into `process.env` for it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSite, resolveSiteUrl } from '../src/seo/schema.mjs';

/** Lowest precedence first, matching Vite's own order. */
const envFiles = (mode) => ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];

/** Deliberately minimal: `KEY=value`, `#` comments, optional quotes. */
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(['"]).*\1$/s.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    out[match[1]] = value;
  }
  return out;
}

export function loadEnvFiles(root, mode = 'production') {
  const out = {};
  for (const file of envFiles(mode)) {
    const path = join(root, file);
    if (existsSync(path)) Object.assign(out, parseEnvFile(readFileSync(path, 'utf8')));
  }
  return out;
}

/**
 * Resolves the site record from an env bag. `strict` throws rather than
 * falling back — every production build and the prerenderer pass it.
 */
export function readSiteEnv(env, { strict = false } = {}) {
  const url = resolveSiteUrl(env.VITE_SITE_URL || env.SITE_URL, { strict, label: 'VITE_SITE_URL' });
  return {
    url,
    site: createSite({
      url,
      name: env.VITE_SITE_NAME || env.SITE_NAME,
      contactEmail: env.VITE_CONTACT_EMAIL,
      contactPhone: env.VITE_CONTACT_PHONE,
    }),
    apiUrl: String(env.SEO_API_URL || 'https://swiss.sds-max.uz').replace(/\/+$/, ''),
  };
}
