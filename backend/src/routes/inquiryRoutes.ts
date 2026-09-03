import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createInquiry } from '../controllers/inquiryController';
import { attachCustomerIfPresent } from '../middleware/customerAuth';
import { requireCaptcha } from '../middleware/turnstile';

const router = Router();

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

router.post('/', inquiryLimiter, requireCaptcha, attachCustomerIfPresent, createInquiry);

export default router;
