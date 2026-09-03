import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * The canonical public origin. Every sitemap URL is built from it, so a
 * localhost value here publishes a sitemap full of unreachable URLs — which is
 * exactly what happened once already. `scripts/check-env.js` refuses to build
 * when it is missing or local; this keeps the same rule at runtime for a
 * server started without a build step.
 */
function siteUrl(): string {
  const raw = (process.env.SITE_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(raw);
  if (isLocal && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
    throw new Error(
      `SITE_URL must be the public storefront origin, not "${raw}". ` +
        'Sitemap URLs are built from it; set it to https://swisswatchpremium.uz.',
    );
  }
  return raw;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/swisswatch'),
  jwtSecret: required('JWT_SECRET', 'dev_secret_change_me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  uploadDir: process.env.UPLOAD_DIR ?? 'src/uploads',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  // Canonical public origin, used for sitemap URLs. Kept separate from
  // CLIENT_URL, which also drives CORS and the links in transactional email
  // and may legitimately point at a preview deployment.
  siteUrl: siteUrl(),
  corsOrigins: (process.env.CORS_ORIGINS ?? `${process.env.CLIENT_URL ?? 'http://localhost:5173'},http://localhost:5175`)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'SwissWatch Premium <concierge@swisswatchpremium.uz>',
  },
  /**
   * Vercel Deploy Hook for the storefront. Catalog pages are prerendered at
   * build time, so a product added through the admin panel has no static page
   * until the next deploy. Unset (local development) makes the trigger a
   * logged no-op — see `services/deployHook.ts`.
   */
  deployHookUrl: (process.env.VERCEL_DEPLOY_HOOK_URL ?? '').trim(),

  /**
   * DataFast analytics, read side.
   *
   * `apiKey` is the website key (`df_…`) and is a genuine secret: it can read
   * every visitor record for the site and write goals against it. It lives
   * here and only here — the storefront ships the *website id* instead, which
   * is public, and the admin panel never talks to datafa.st at all. See
   * `services/datafast.ts`.
   *
   * Unset is a supported state, not an error: the analytics endpoints answer
   * 503 and the rest of the API is unaffected, so a local checkout or a
   * deploy made before the DataFast account exists still runs.
   *
   * `timezone` decides where a day starts. Left at UTC, "today" on the
   * dashboard would begin at 05:00 Tashkent time and the daily numbers would
   * never line up with what the boutique actually sees.
   */
  datafast: {
    apiKey: (process.env.DATAFAST_API_KEY ?? '').trim(),
    apiUrl: (process.env.DATAFAST_API_URL ?? 'https://datafa.st/api/v1').replace(/\/+$/, ''),
    timezone: (process.env.DATAFAST_TIMEZONE ?? 'Asia/Tashkent').trim(),
  },
};
