import { Router } from 'express';
import { listBrands, getBrandBySlug } from '../controllers/brandController';

const router = Router();

router.get('/', listBrands);
router.get('/:slug', getBrandBySlug);

export default router;
