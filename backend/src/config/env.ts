import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
  siteUrl: (process.env.SITE_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? `${process.env.CLIENT_URL ?? 'http://localhost:5173'},http://localhost:5175`)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'SwissWatch <concierge@swisswatch.uz>',
  },
};
