import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { track } from '../controllers/trackController';

/**
 * The storefront's tracking beacon. Public and unauthenticated by necessity —
 * it is called by every visitor, none of whom has an account.
 *
 * The limiter is sized for a person, not a crawler: a fast reader might open a
 * dozen pages a minute and the tracker batches several of those into one
 * request, so 120 is far above normal use and still stops a script trying to
 * stuff the collection. Exceeding it costs that IP its analytics, nothing else.
 */
const router = Router();

const trackLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  // A beacon never reads the response, so there is nothing useful to say.
  handler: (_req, res) => res.status(204).end(),
});

router.post('/', trackLimiter, track);

export default router;
