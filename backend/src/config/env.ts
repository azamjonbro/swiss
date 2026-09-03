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
   * The storefront's own hostname, derived from SITE_URL.
   *
   * Analytics needs it to recognise a referrer that is the storefront itself:
   * without the check, every visitor moving from one page to the next is
   * classified as a referral from swisswatchpremium.uz, and the site becomes
   * its own biggest traffic source.
   */
  siteHost: (() => {
    try {
      return new URL(siteUrl()).hostname;
    } catch {
      return 'swisswatchpremium.uz';
    }
  })(),

  /**
   * Where a day starts for the analytics dashboard. Left at UTC, "today" would
   * begin at 05:00 in Tashkent and the daily figures would never match what
   * the boutique actually sees.
   */
  analyticsTimezone: (process.env.ANALYTICS_TIMEZONE ?? 'Asia/Tashkent').trim(),
};
