import { Router } from 'express';
import { getAnalyticsLive, getAnalyticsSummary } from '../controllers/analyticsController';

/**
 * Mounted inside adminRoutes, which applies `requireAuth` above it — so these
 * are admin-only without repeating the guard here.
 */
const router = Router();

router.get('/summary', getAnalyticsSummary);
router.get('/live', getAnalyticsLive);

export default router;
