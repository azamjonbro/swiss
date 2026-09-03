import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getAnalyticsLive, getAnalyticsSummary } from '../controllers/analyticsController';

/**
 * Mounted inside adminRoutes, which applies `requireAuth` to everything below
 * it — so these are already admin-only and no guard is repeated here.
 *
 * The limiter is not about abuse. DataFast allows 60 requests per window and
 * one summary spends eleven of them; a dashboard left open in a loop, or a
 * tab that reconnects in a tight retry, could burn the site's whole budget
 * and leave the panel unable to load for everyone. The ceiling is generous
 * for a person clicking through date ranges and low enough to stop a runaway.
 */
const router = Router();

const analyticsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many analytics requests. Try again in a moment.' },
});

router.get('/summary', analyticsLimiter, getAnalyticsSummary);
router.get('/live', analyticsLimiter, getAnalyticsLive);

export default router;
