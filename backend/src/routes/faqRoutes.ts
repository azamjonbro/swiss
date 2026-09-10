import { Router } from 'express';
import { listFaqs } from '../controllers/faqController';

const router = Router();

router.get('/', listFaqs);

export default router;
