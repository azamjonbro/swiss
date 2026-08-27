/**
 * Build gate for the API.
 *
 * `SITE_URL` is the origin every sitemap URL is built from. Missing or
 * localhost there does not fail loudly at runtime — it publishes a sitemap
 * full of URLs no crawler can reach, which is what happened once already. The
 * only reliable fix is to refuse to build.
 *
 * Runs as `prebuild`, so `npm run build` cannot skip it.
 */
require('dotenv').config({ quiet: true });

const RECOMMENDED = 'https://swisswatchpremium.uz';

const raw = String(process.env.SITE_URL || '').trim().replace(/\/+$/, '');

let problem = '';
if (!raw) problem = 'is not set';
else if (!/^https?:\/\//i.test(raw)) problem = `must be an absolute http(s) URL (got "${raw}")`;
else {
  let host = '';
  try {
    host = new URL(raw).hostname;
  } catch {
    problem = `is not a parsable URL (got "${raw}")`;
  }
  if (!problem && /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host)) {
    problem = `must not point at localhost (got "${raw}")`;
  }
  if (!problem && /\.vercel\.app$/i.test(host)) {
    problem = `must not point at a *.vercel.app preview host (got "${raw}")`;
  }
}

if (problem) {
  console.error(
    `\n[env] SITE_URL ${problem}.\n` +
      `      Every sitemap URL is built from it. Set SITE_URL=${RECOMMENDED} in the\n` +
      `      environment (Vercel dashboard: Production and Preview) and build again.\n`,
  );
  process.exit(1);
}

console.log(`[env] SITE_URL = ${raw}`);
