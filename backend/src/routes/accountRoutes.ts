import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  me,
  logout,
  updateProfile,
  changePassword,
  listSaved,
  listSavedIds,
  addSaved,
  removeSaved,
  listOrders,
} from '../controllers/accountController';
import { requireCustomerAuth } from '../middleware/customerAuth';
import { requireCaptcha } from '../middleware/turnstile';

const router = Router();

// Credential endpoints are throttled per IP; everything behind requireCustomerAuth
// is already gated by a valid session and left unthrottled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

// --- public ---
router.post('/register', authLimiter, requireCaptcha, register);
router.post('/login', authLimiter, requireCaptcha, login);
router.post('/logout', logout);

// --- customer session required ---
router.get('/me', requireCustomerAuth, me);
router.patch('/profile', requireCustomerAuth, updateProfile);
router.post('/change-password', requireCustomerAuth, requireCaptcha, changePassword);
router.get('/saved', requireCustomerAuth, listSaved);
router.get('/saved/ids', requireCustomerAuth, listSavedIds);
router.post('/saved', requireCustomerAuth, addSaved);
router.delete('/saved/:watchId', requireCustomerAuth, removeSaved);
router.get('/orders', requireCustomerAuth, listOrders);

export default router;
