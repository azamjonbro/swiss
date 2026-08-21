import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, verifyEmail, resendVerification, login, me, logout } from '../controllers/accountController';
import { requireCustomerAuth } from '../middleware/customerAuth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

router.post('/register', authLimiter, register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/login', authLimiter, login);
router.get('/me', requireCustomerAuth, me);
router.post('/logout', logout);

export default router;
