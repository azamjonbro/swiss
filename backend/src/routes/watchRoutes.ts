import { Router } from 'express';
import { listWatches, getWatchBySlug } from '../controllers/watchController';

const router = Router();

router.get('/', listWatches);
router.get('/:slug', getWatchBySlug);

export default router;
