import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/error';
import { resizeImages } from './middleware/resizeImages';

import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import watchRoutes from './routes/watchRoutes';
import categoryRoutes from './routes/categoryRoutes';
import brandRoutes from './routes/brandRoutes';
import collectionRoutes from './routes/collectionRoutes';
import inquiryRoutes from './routes/inquiryRoutes';
import adminRoutes from './routes/adminRoutes';
import trackRoutes from './routes/trackRoutes';
import { getSitemapIndex, getSitemapSection } from './controllers/sitemapController';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

/**
 * This host is infrastructure, not a storefront.
 *
 * It answers on its own public hostname, which means a crawler can reach the
 * catalog as raw JSON and the sitemaps as documents that advertise a *different*
 * origin — the storefront's. Both are served here only so Vercel can proxy them
 * onto the canonical domain; neither belongs in a search index under this name.
 *
 * `noindex` rather than a robots.txt disallow for /api: the storefront renders
 * client-side from these endpoints, and Googlebot has to be able to fetch them
 * while rendering the pages it *does* index. A header keeps them readable and
 * unindexable at the same time. /uploads is left alone — it is the product
 * photography, and Google needs it both to render pages and for image search.
 */
app.use(['/api', '/sitemap.xml', '/sitemap-:section'], (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
});

/**
 * robots.txt for the API host itself.
 *
 * Without one, this hostname is fully crawlable: `/sitemap.xml` here lists
 * storefront URLs, which reads to a crawler as one site claiming another site's
 * pages. The storefront has its own robots.txt (frontend/public/robots.txt) and
 * is unaffected — robots rules are per-host, and the proxied copies are fetched
 * under the storefront's name, not this one.
 *
 * Deliberately no `Sitemap:` line: the sitemap is submitted for the storefront
 * origin, not for this one.
 */
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(
    [
      '# API and media host for the SwissWatch Premium storefront.',
      '# The public site is https://swisswatchpremium.uz — index that, not this.',
      '',
      'User-agent: *',
      'Disallow: /',
      '',
      '# Product photography stays open: Google fetches it to render the',
      '# storefront and to surface it in image search.',
      'Allow: /uploads/',
      '',
    ].join('\n'),
  );
});

// `?w=` is answered by the resizer; everything else falls straight through to
// static, so existing URLs are untouched.
const uploadRoot = path.join(process.cwd(), env.uploadDir);
app.use('/uploads', resizeImages(uploadRoot, path.join(uploadRoot, '.resized')));
// A week, matching the derivatives the resizer serves. Product photography is
// replaced by uploading a new file, not by overwriting one in place, so a long
// freshness window costs nothing — and at `max-age=0` every image on a listing
// page paid a revalidation round trip on every single view.
app.use('/uploads', express.static(uploadRoot, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'swisswatch-api' }));
app.get('/sitemap.xml', getSitemapIndex);
// `:section` swallows the ".xml" suffix; the controller strips it.
app.get('/sitemap-:section', getSitemapSection);

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/watches', watchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
// The storefront's analytics beacon. Public: every visitor calls it.
app.use('/api/track', trackRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
