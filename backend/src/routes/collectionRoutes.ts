import { Router } from 'express';
import { listCollections, getCollectionBySlug } from '../controllers/collectionController';

const router = Router();

router.get('/', listCollections);
router.get('/:slug', getCollectionBySlug);

export default router;
