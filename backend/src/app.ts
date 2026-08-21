import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/error';

import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import watchRoutes from './routes/watchRoutes';
import categoryRoutes from './routes/categoryRoutes';
import brandRoutes from './routes/brandRoutes';
import collectionRoutes from './routes/collectionRoutes';
import inquiryRoutes from './routes/inquiryRoutes';
import adminRoutes from './routes/adminRoutes';
import { getSitemap } from './controllers/sitemapController';

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

app.use('/uploads', express.static(path.join(process.cwd(), env.uploadDir)));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'swisswatch-api' }));
app.get('/sitemap.xml', getSitemap);

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/watches', watchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
